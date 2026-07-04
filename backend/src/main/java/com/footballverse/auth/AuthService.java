package com.footballverse.auth;

import com.footballverse.auth.dto.AuthResponse;
import com.footballverse.auth.dto.CurrentUserResponse;
import com.footballverse.auth.dto.LoginRequest;
import com.footballverse.auth.dto.RefreshTokenRequest;
import com.footballverse.auth.dto.RegisterRequest;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.security.CurrentUser;
import com.footballverse.security.JwtService;
import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
import com.footballverse.user.UserProfile;
import com.footballverse.user.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserAccountRepository users;
    private final UserProfileRepository profiles;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CurrentUser currentUser;

    @Value("${app.jwt.refresh-token-days}")
    private long refreshTokenDays;

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
        UserAccount user = users.findByEmail(request.email().toLowerCase())
                .orElseThrow(() -> new BadRequestException("Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid credentials");
        }
        return tokens(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken refreshToken = refreshTokens.findByToken(request.refreshToken())
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));
        if (!refreshToken.isActive()) {
            throw new BadRequestException("Invalid refresh token");
        }
        refreshToken.setRevokedAt(Instant.now());
        return tokens(refreshToken.getUser());
    }

    @Transactional
    public void logout(RefreshTokenRequest request) {
        refreshTokens.findByToken(request.refreshToken()).ifPresent(token -> token.setRevokedAt(Instant.now()));
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
