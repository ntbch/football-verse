package com.footballverse.auth.service;

import com.footballverse.auth.model.AuthRateLimitWindow;
import com.footballverse.auth.repository.AuthRateLimitWindowRepository;
import com.footballverse.common.exception.BadRequestException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

/**
 * Brute-force guard for password logins. Reuses the {@link AuthRateLimitWindow}
 * store with login-scoped action keys, so the shared expired-window cleanup
 * covers it. Failure recording runs in an independent transaction because the
 * caller rolls back its own transaction when rejecting bad credentials.
 */
@Service
@RequiredArgsConstructor
public class AuthLoginThrottleService {
    private static final Duration FAILURE_WINDOW = Duration.ofMinutes(15);
    private static final String ACCOUNT_ACTION = "login:account";
    private static final String IP_ACTION = "login:ip";
    private static final int MAX_FAILURES_PER_ACCOUNT = 5;
    private static final int MAX_FAILURES_PER_IP = 20;

    private final AuthRateLimitWindowRepository limits;

    @Value("${app.auth.rate-limit-secret:}")
    private String rateLimitSecret;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.auth.trusted-proxies:}")
    private String trustedProxies;

    /** Rejects the attempt while the account or source IP is inside a lockout window. */
    @Transactional(propagation = Propagation.SUPPORTS)
    public void checkLockout(String accountIdentity, HttpServletRequest request) {
        Instant now = Instant.now();
        assertNotLocked(ACCOUNT_ACTION, accountIdentity, MAX_FAILURES_PER_ACCOUNT, now);
        assertNotLocked(IP_ACTION, clientIp(request), MAX_FAILURES_PER_IP, now);
    }

    /**
     * Counts one failed credential attempt. Runs in its own transaction so the
     * counter survives the caller's rollback triggered by the rejection.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(String accountIdentity, HttpServletRequest request) {
        Instant now = Instant.now();
        countFailure(ACCOUNT_ACTION, accountIdentity, now);
        countFailure(IP_ACTION, clientIp(request), now);
    }

    private void assertNotLocked(String action, String identity, int maxFailures, Instant now) {
        int attempts = limits.findActiveAttempts(action, hmac(identity), now.minus(FAILURE_WINDOW)).orElse(0);
        if (attempts >= maxFailures) {
            throw new BadRequestException("Too many failed sign-in attempts. Please try again later.");
        }
    }

    private void countFailure(String action, String identity, Instant now) {
        String identityHash = hmac(identity);
        AuthRateLimitWindow window = limits.findForUpdate(action, identityHash)
                .orElseGet(() -> limits.save(new AuthRateLimitWindow(action, identityHash, now)));
        if (window.getWindowStartedAt().plus(FAILURE_WINDOW).isBefore(now)) {
            window.setWindowStartedAt(now);
            window.setAttempts(0);
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

    private String hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            String secret = rateLimitSecret.isBlank() ? jwtSecret : rateLimitSecret;
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot protect login throttle identity", exception);
        }
    }
}
