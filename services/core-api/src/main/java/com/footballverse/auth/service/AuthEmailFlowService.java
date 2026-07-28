package com.footballverse.auth.service;

import com.footballverse.auth.model.AuthActionToken;
import com.footballverse.auth.model.AuthRateLimitWindow;
import com.footballverse.auth.model.AuthTokenPurpose;
import com.footballverse.auth.repository.AuthActionTokenRepository;
import com.footballverse.auth.repository.AuthRateLimitWindowRepository;
import com.footballverse.auth.repository.RefreshTokenRepository;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserAccountRepository;
import com.footballverse.user.repository.UserProfileRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthEmailFlowService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration RATE_WINDOW = Duration.ofHours(1);

    private final UserAccountRepository users;
    private final UserProfileRepository profiles;
    private final AuthActionTokenRepository tokens;
    private final AuthRateLimitWindowRepository limits;
    private final RefreshTokenRepository refreshTokens;
    private final AuthMailService mail;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.auth.rate-limit-secret}")
    private String rateLimitSecret;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.auth.trusted-proxies:}")
    private String trustedProxies;

    @Transactional
    public void startRegistration(UserAccount user, String email, HttpServletRequest request) {
        consumeRateLimit("register", normalizeEmail(email), clientIp(request));
        issue(user, AuthTokenPurpose.VERIFY_EMAIL, false);
    }

    @Transactional
    public void resumePendingRegistration(UserAccount user, String email, HttpServletRequest request) {
        consumeRateLimit("register", normalizeEmail(email), clientIp(request));
        issue(user, AuthTokenPurpose.VERIFY_EMAIL, true);
    }

    @Transactional
    public void resendVerification(String email, HttpServletRequest request) {
        String normalized = normalizeEmail(email);
        consumeRateLimit("verify", normalized, clientIp(request));
        users.findByEmail(normalized)
                .filter(user -> !user.isEmailVerified())
                .ifPresent(user -> issue(user, AuthTokenPurpose.VERIFY_EMAIL, false));
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        AuthActionToken token = usableToken(rawToken, AuthTokenPurpose.VERIFY_EMAIL);
        UserAccount user = users.findByIdForUpdate(token.getUser().getId())
                .orElseThrow(() -> new BadRequestException("This link is invalid or has expired"));
        token.setConsumedAt(Instant.now());
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(Instant.now());
    }

    @Transactional
    public void requestPasswordReset(String email, HttpServletRequest request) {
        String normalized = normalizeEmail(email);
        consumeRateLimit("reset", normalized, clientIp(request));
        users.findByEmail(normalized)
                .filter(user -> user.isEmailVerified() && user.getPasswordHash() != null)
                .ifPresent(user -> issue(user, AuthTokenPurpose.RESET_PASSWORD, false));
    }

    @Transactional
    public void resetPassword(String rawToken, String password) {
        AuthActionToken token = usableToken(rawToken, AuthTokenPurpose.RESET_PASSWORD);
        UserAccount user = users.findByIdForUpdate(token.getUser().getId())
                .orElseThrow(() -> new BadRequestException("This link is invalid or has expired"));
        token.setConsumedAt(Instant.now());
        user.setPasswordHash(passwordEncoder.encode(password));
        refreshTokens.revokeActiveByUserId(user.getId(), Instant.now());
    }

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void removeExpiredUnverifiedAccounts() {
        Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);
        for (UserAccount user : users.findByEmailVerifiedFalseAndCreatedAtBefore(cutoff)) {
            profiles.deleteByUserId(user.getId());
            users.delete(user);
        }
        tokens.deleteByExpiresAtBefore(Instant.now().minus(7, ChronoUnit.DAYS));
        limits.deleteByWindowStartedAtBefore(Instant.now().minus(2, ChronoUnit.HOURS));
    }

    private void issue(UserAccount user, AuthTokenPurpose purpose, boolean ignoreCooldown) {
        Instant now = Instant.now();
        var activeTokens = tokens.findActiveByUserAndPurposeForUpdate(user.getId(), purpose);
        if (activeTokens.stream().anyMatch(active -> active.getCreatedAt().plus(60, ChronoUnit.SECONDS).isAfter(now))) {
            if (ignoreCooldown) {
                return;
            }
            throw new BadRequestException("Please wait a minute before requesting another email");
        }
        activeTokens.forEach(active -> active.setConsumedAt(now));
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expiresAt = purpose == AuthTokenPurpose.VERIFY_EMAIL
                ? now.plus(24, ChronoUnit.HOURS)
                : now.plus(30, ChronoUnit.MINUTES);
        tokens.save(new AuthActionToken(user, purpose, sha256(rawToken), expiresAt));
        mail.queue(user, purpose, rawToken);
    }

    private AuthActionToken usableToken(String rawToken, AuthTokenPurpose purpose) {
        AuthActionToken token = tokens.findByTokenHashForUpdate(sha256(rawToken.trim()))
                .orElseThrow(() -> new BadRequestException("This link is invalid or has expired"));
        if (token.getPurpose() != purpose || !token.isUsable(Instant.now())) {
            throw new BadRequestException("This link is invalid or has expired");
        }
        return token;
    }

    // ponytail: process-local lock avoids duplicate counters on one instance; move this to a Redis/gateway limiter if the API is scaled horizontally.
    private synchronized void consumeRateLimit(String action, String email, String ip) {
        Instant now = Instant.now();
        consume(action + ":email", email, 5, now);
        consume(action + ":ip", ip, 20, now);
    }

    private void consume(String action, String identity, int maxAttempts, Instant now) {
        String hash = hmac(identity);
        AuthRateLimitWindow window = limits.findForUpdate(action, hash)
                .orElseGet(() -> limits.save(new AuthRateLimitWindow(action, hash, now)));
        if (window.getWindowStartedAt().plus(RATE_WINDOW).isBefore(now)) {
            window.setWindowStartedAt(now);
            window.setAttempts(0);
        }
        if (window.getAttempts() >= maxAttempts) {
            throw new BadRequestException("Please try again later");
        }
        window.setAttempts(window.getAttempts() + 1);
    }

    private String clientIp(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        boolean trusted = java.util.Arrays.stream(trustedProxies.split(","))
                .map(String::trim)
                .anyMatch(remote::equals);
        if (trusted) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",", 2)[0].trim();
            }
        }
        return remote;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot hash auth token", exception);
        }
    }

    private String hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            String secret = rateLimitSecret.isBlank() ? jwtSecret : rateLimitSecret;
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot protect rate limit identity", exception);
        }
    }
}
