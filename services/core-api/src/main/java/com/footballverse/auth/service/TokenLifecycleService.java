package com.footballverse.auth.service;

import com.footballverse.auth.dto.AuthResponse;
import com.footballverse.auth.model.RefreshToken;
import com.footballverse.auth.repository.RefreshTokenRepository;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.security.CurrentUser;
import com.footballverse.security.JwtService;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Owns the refresh-token session lifecycle: rotation on refresh, single-token
 * logout, account-wide revocation, and the shared session-issue routine used
 * by every authentication path.
 */
@Service
@RequiredArgsConstructor
public class TokenLifecycleService {
    private final RefreshTokenRepository refreshTokens;
    private final JwtService jwtService;
    private final CurrentUser currentUser;
    private final RefreshTokenReuseService refreshTokenReuseService;

    @Value("${app.jwt.refresh-token-days}")
    private long refreshTokenDays;

    @Transactional
    public AuthResponse refresh(String token) {
        RefreshToken refreshToken = refreshTokens.findByTokenHash(tokenHash(token))
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));
        if (!refreshToken.isActive()) {
            // Reuse of an already-revoked token is a theft signal: revoke every
            // still-active session in the same family. The revocation commits
            // in its own transaction FIRST, because rejecting the request below
            // rolls this method's transaction back.
            UUID familyId = refreshToken.getFamilyId();
            if (familyId != null) {
                refreshTokenReuseService.revokeActiveFamilyTokens(familyId);
            }
            throw new BadRequestException("Invalid refresh token");
        }
        refreshToken.setRevokedAt(Instant.now());
        return issueTokens(refreshToken.getUser(), refreshToken.getFamilyId());
    }

    @Transactional
    public void logout(String token) {
        refreshTokens.findByTokenHash(tokenHash(token)).ifPresent(refreshToken -> refreshToken.setRevokedAt(Instant.now()));
    }

    @Transactional
    public void revokeAllSessions() {
        refreshTokens.revokeActiveByUserId(currentUser.get().getId(), Instant.now());
    }

    /** Issues a fresh session (access + refresh pair) for an authenticated user. */
    public AuthResponse issueTokens(UserAccount user, UUID existingFamilyId) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BadRequestException("Invalid credentials");
        }
        String rawRefreshToken = UUID.randomUUID().toString();
        UUID familyId = existingFamilyId != null ? existingFamilyId : UUID.randomUUID();
        refreshTokens.save(new RefreshToken(
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