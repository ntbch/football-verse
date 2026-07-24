package com.footballverse.auth.service;
import com.footballverse.auth.model.RefreshToken;
import com.footballverse.auth.repository.RefreshTokenRepository;

import com.footballverse.auth.dto.AuthResponse;
import com.footballverse.auth.dto.CurrentUserResponse;
import com.footballverse.auth.dto.GoogleAuthRequest;
import com.footballverse.auth.dto.LoginRequest;
import com.footballverse.auth.dto.RegisterRequest;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.security.CurrentUser;
import com.footballverse.security.JwtService;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserAccountRepository;
import com.footballverse.user.model.UserProfile;
import com.footballverse.user.repository.UserProfileRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private final UserAccountRepository users;
    private final UserProfileRepository profiles;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CurrentUser currentUser;

    @Value("${app.jwt.refresh-token-days}")
    private long refreshTokenDays;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (users.existsByEmail(request.email().toLowerCase())) {
            throw new BadRequestException("Email already exists");
        }
        if (users.existsByUsername(request.username())) {
            throw new BadRequestException("Username already exists");
        }

        UserAccount user = users.save(new UserAccount(
                request.email().toLowerCase(),
                request.username(),
                passwordEncoder.encode(request.password())
        ));
        profiles.save(new UserProfile(user, request.username()));
        return tokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String input = request.email().trim();
        UserAccount user = users.findByEmail(input.toLowerCase())
                .orElseGet(() -> users.findByUsername(input).orElse(null));
        if (user == null) {
            throw new BadRequestException("Invalid credentials");
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid credentials");
        }
        return tokens(user);
    }

    @Transactional
    public AuthResponse googleLogin(GoogleAuthRequest request) {
        // Verify the Google ID token
        JsonNode payload = verifyGoogleToken(request.idToken());
        String googleId = payload.get("sub").asText();
        String email = payload.get("email").asText().toLowerCase();
        String name = payload.has("name") ? payload.get("name").asText() : email.split("@")[0];

        // Find by googleId first, then by email
        UserAccount user = users.findByGoogleId(googleId).orElse(null);

        if (user == null) {
            user = users.findByEmail(email).orElse(null);
            if (user != null) {
                // Link Google account to existing user
                user.setGoogleId(googleId);
            } else {
                // Create new user
                String username = generateUniqueUsername(name);
                user = users.save(new UserAccount(email, username, googleId, true));
                profiles.save(new UserProfile(user, name));
            }
        }

        return tokens(user);
    }

    private JsonNode verifyGoogleToken(String idToken) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken))
                    .GET()
                    .build();
            HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                throw new BadRequestException("Invalid Google token");
            }
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(resp.body());

            // Verify audience matches our client ID
            if (!googleClientId.isBlank()) {
                String aud = node.get("aud").asText();
                if (!googleClientId.equals(aud)) {
                    throw new BadRequestException("Google token audience mismatch");
                }
            }

            return node;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to verify Google token", e);
            throw new BadRequestException("Failed to verify Google token");
        }
    }

    private String generateUniqueUsername(String name) {
        String base = name.toLowerCase().replaceAll("[^a-z0-9]", "");
        if (base.isBlank()) base = "user";
        if (base.length() > 20) base = base.substring(0, 20);
        String candidate = base;
        int suffix = 1;
        while (users.existsByUsername(candidate)) {
            candidate = base + suffix++;
        }
        return candidate;
    }

    @Transactional
    public AuthResponse refresh(String token) {
        RefreshToken refreshToken = refreshTokens.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));
        if (!refreshToken.isActive()) {
            throw new BadRequestException("Invalid refresh token");
        }
        refreshToken.setRevokedAt(Instant.now());
        return tokens(refreshToken.getUser());
    }

    @Transactional
    public void logout(String token) {
        refreshTokens.findByToken(token).ifPresent(refreshToken -> refreshToken.setRevokedAt(Instant.now()));
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse me() {
        UserAccount user = currentUser.get();
        return new CurrentUserResponse(user.getId(), user.getEmail(), user.getUsername(), user.getStatus(), user.getRoles());
    }

    private AuthResponse tokens(UserAccount user) {
        RefreshToken refreshToken = refreshTokens.save(new RefreshToken(
                user,
                UUID.randomUUID().toString(),
                Instant.now().plus(refreshTokenDays, ChronoUnit.DAYS)
        ));
        return new AuthResponse(
                jwtService.createAccessToken(user),
                refreshToken.getToken(),
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getRoles()
        );
    }
}
