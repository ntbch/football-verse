package com.footballverse.game.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.net.InetAddress;

@Component
public class InternalGatewayFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(InternalGatewayFilter.class);
    public static final String USER_ID_ATTRIBUTE = "gameUserId";
    private final String internalToken;
    private final JwtVerifier jwtVerifier;
    private final boolean allowLegacyHeaders;

    public InternalGatewayFilter(
            @Value("${app.internal-token}") String internalToken,
            JwtVerifier jwtVerifier,
            // ponytail: contracted legacy headers default to false for Phase 5 schema/contract contraction
            @Value("${app.auth.allow-legacy-headers:false}") boolean allowLegacyHeaders
    ) {
        this.internalToken = internalToken;
        this.jwtVerifier = jwtVerifier;
        this.allowLegacyHeaders = allowLegacyHeaders;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().equals("/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = request.getHeader("X-Internal-Token");
        String userId = request.getHeader("X-User-Id");
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            if (!matchesInternalToken(token)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                return;
            }
            try {
                request.setAttribute(USER_ID_ATTRIBUTE, jwtVerifier.verifiedUserId(authorization.substring(7)));
                chain.doFilter(request, response);
                return;
            } catch (IllegalArgumentException exception) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                return;
            }
        }
        if (!allowLegacyHeaders || !isPrivateSource(request.getRemoteAddr())
                || !matchesInternalToken(token)
                || userId == null || !userId.matches("[1-9]\\d*")) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
            return;
        }
        request.setAttribute(USER_ID_ATTRIBUTE, Long.parseLong(userId));
        response.setHeader("X-Auth-Compatibility", "legacy-header");
        String requestId = request.getHeader("X-Request-Id");
        log.warn("Legacy game authentication accepted; requestId={}",
                requestId != null && requestId.matches("[A-Za-z0-9-]{1,64}") ? requestId : "missing");
        chain.doFilter(request, response);
    }

    private boolean matchesInternalToken(String token) {
        return !internalToken.isBlank() && token != null && MessageDigest.isEqual(
                token.getBytes(StandardCharsets.UTF_8), internalToken.getBytes(StandardCharsets.UTF_8));
    }

    private boolean isPrivateSource(String address) {
        try {
            InetAddress inetAddress = InetAddress.getByName(address);
            return inetAddress.isLoopbackAddress() || inetAddress.isSiteLocalAddress();
        } catch (Exception exception) {
            return false;
        }
    }
}
