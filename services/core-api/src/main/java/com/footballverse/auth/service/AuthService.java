package com.footballverse.auth.service;
import com.footballverse.auth.model.RefreshToken;
import com.footballverse.auth.repository.RefreshTokenRepository;

import com.footballverse.auth.dto.AuthResponse;
import com.footballverse.auth.dto.CurrentUserResponse;
import com.footballverse.auth.dto.VerificationPendingResponse;
import com.footballverse.auth.dto.GoogleAuthRequest;
import com.footballverse.auth.dto.LoginRequest;
import com.footballverse.auth.dto.RegisterRequest;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.security.CurrentUser;
import com.footballverse.security.JwtService;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserStatus;
import com.footballverse.user.repository.UserAccountRepository;
import com.footballverse.user.model.UserProfile;
import com.footballverse.user.repository.UserProfileRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.servlet.http.HttpServletRequest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
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
    private final AuthEmailFlowService emailFlows;
    private final AuthLoginThrottleService loginThrottle;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final org.springframework.transaction.PlatformTransactionManager transactionManager;

    @Value("${app.jwt.refresh-token-days}")
    private long refreshTokenDays;

    @Transactional
    public VerificationPendingResponse register(RegisterRequest request, HttpServletRequest servletRequest) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        UserAccount existing = users.findByEmail(email).orElse(null);
        if (existing != null) {
            if (!existing.isEmailVerified() && existing.getPasswordHash() != null) {
                emailFlows.resumePendingRegistration(existing, email, servletRequest);
            }
            return new VerificationPendingResponse(email);
        }
        if (users.existsByUsername(request.username())) {
            throw new BadRequestException("Username already exists");
        }

        UserAccount user = users.save(new UserAccount(
                email,
                request.username(),
                passwordEncoder.encode(request.password())
        ));
        profiles.save(new UserProfile(user, request.username()));
        emailFlows.startRegistration(user, email, servletRequest);
        return new VerificationPendingResponse(email);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest servletRequest) {
        String input = request.email().trim();
        String accountKey = input.toLowerCase(Locale.ROOT);
        loginThrottle.checkLockout(accountKey, servletRequest);
        UserAccount user = users.findByEmail(accountKey)
                .orElseGet(() -> users.findByUsername(input).orElse(null));
        boolean passwordMatches = user != null
                && user.getPasswordHash() != null
                && passwordEncoder.matches(request.password(), user.getPasswordHash());
        if (!passwordMatches) {
            loginThrottle.recordFailure(accountKey, servletRequest);
            throw new BadRequestException("Invalid credentials");
        }
        if (!user.isEmailVerified()) {
            throw new BadRequestException("Invalid credentials");
        }
        return tokens(user);
    }

    public AuthResponse googleLogin(GoogleAuthRequest request) {
        // Network verification happens outside any transaction so a slow or
        // hung upstream call can never hold a servlet thread with a database
        // connection open.
        JsonNode payload = googleTokenVerifier.verify(request.idToken());
        var tx = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        return tx.execute(status -> completeGoogleLogin(payload));
    }

    private AuthResponse completeGoogleLogin(JsonNode payload) {
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
                if (!user.isEmailVerified()) {
                    user.setEmailVerified(true);
                    user.setEmailVerifiedAt(Instant.now());
                }
            } else {
                // Create new user
                String username = generateUniqueUsername(name);
                user = users.save(new UserAccount(email, username, googleId, true));
                profiles.save(new UserProfile(user, name));
            }
        }

        return tokens(user);
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
        RefreshToken refreshToken = refreshTokens.findByTokenHash(tokenHash(token))
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));
        if (!refreshToken.isActive()) {
            // Reuse of an already-revoked token is a theft signal: revoke every
            // still-active session in the same family.
            java.util.UUID familyId = refreshToken.getFamilyId();
            if (familyId != null) {
                int revoked = refreshTokens.revokeActiveByFamilyId(familyId, Instant.now());
                if (revoked > 0) {
                    log.warn("Refresh token reuse detected; revoked {} active session(s) of family {}", revoked, familyId);
                }
            }
            throw new BadRequestException("Invalid refresh token");
        }
        refreshToken.setRevokedAt(Instant.now());
        return tokens(refreshToken.getUser(), refreshToken.getFamilyId());
    }

    @Transactional
    public void logout(String token) {
        refreshTokens.findByTokenHash(tokenHash(token)).ifPresent(refreshToken -> refreshToken.setRevokedAt(Instant.now()));
    }

    @Transactional
    public void revokeAllSessions() {
        refreshTokens.revokeActiveByUserId(currentUser.get().getId(), Instant.now());
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse me() {
        UserAccount user = currentUser.get();
        return new CurrentUserResponse(user.getId(), user.getEmail(), user.getUsername(), user.getStatus(), user.getRoles());
    }

    private AuthResponse tokens(UserAccount user) {
        return tokens(user, null);
    }

    private AuthResponse tokens(UserAccount user, UUID existingFamilyId) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BadRequestException("Invalid credentials");
        }
        String rawRefreshToken = UUID.randomUUID().toString();
        UUID familyId = existingFamilyId != null ? existingFamilyId : UUID.randomUUID();
        RefreshToken refreshToken = refreshTokens.save(new RefreshToken(
                user,
                tokenHash(rawRefreshToken),
                Instant.now().plus(refreshTokenDays, ChronoUnit.DAYS),
                familyId
        ));
        return new AuthResponse(
                jwtService.createAccessToken(user),
                rawRefreshToken,
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getRoles()
        );
    }

    private String tokenHash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
