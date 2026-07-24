package com.footballverse.auth.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Arrays;
import java.util.Set;

@Component
public class RefreshCookieService {
    private static final String PATH = "/api/v1/auth";
    private static final Set<String> SAME_SITE_VALUES = Set.of("Strict", "Lax", "None");

    private final String name;
    private final boolean secure;
    private final String sameSite;
    private final Duration lifetime;

    public RefreshCookieService(
            @Value("${app.auth.refresh-cookie.name}") String name,
            @Value("${app.auth.refresh-cookie.secure}") boolean secure,
            @Value("${app.auth.refresh-cookie.same-site}") String sameSite,
            @Value("${app.jwt.refresh-token-days}") long refreshTokenDays,
            @Value("${app.environment:development}") String environment
    ) {
        if (name == null || !name.matches("[A-Za-z0-9_]{1,64}")) {
            throw new IllegalArgumentException("Invalid refresh cookie name");
        }
        if (!SAME_SITE_VALUES.contains(sameSite)) {
            throw new IllegalArgumentException("Refresh cookie SameSite must be Strict, Lax, or None");
        }
        if (("production".equalsIgnoreCase(environment) || "None".equals(sameSite)) && !secure) {
            throw new IllegalArgumentException("Secure refresh cookies are required for this environment");
        }
        this.name = name;
        this.secure = secure;
        this.sameSite = sameSite;
        this.lifetime = Duration.ofDays(refreshTokenDays);
    }

    public ResponseCookie create(String token) {
        return base().value(token).maxAge(lifetime).build();
    }

    public ResponseCookie clear() {
        return base().value("").maxAge(Duration.ZERO).build();
    }

    // ponytail: contracted legacy body refresh resolution; HttpOnly cookie is strictly required
    public String resolve(HttpServletRequest request) {
        if (request.getCookies() != null) {
            return Arrays.stream(request.getCookies())
                    .filter(cookie -> name.equals(cookie.getName()))
                    .map(Cookie::getValue)
                    .filter(value -> !value.isBlank())
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    private ResponseCookie.ResponseCookieBuilder base() {
        return ResponseCookie.from(name)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(PATH);
    }
}
