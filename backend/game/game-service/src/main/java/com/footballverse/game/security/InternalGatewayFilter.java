package com.footballverse.game.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class InternalGatewayFilter extends OncePerRequestFilter {
    public static final String USER_ID_ATTRIBUTE = "gameUserId";
    private final String internalToken;

    public InternalGatewayFilter(@Value("${app.internal-token}") String internalToken) {
        this.internalToken = internalToken;
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
        if (internalToken.isBlank() || token == null || !MessageDigest.isEqual(
                token.getBytes(StandardCharsets.UTF_8), internalToken.getBytes(StandardCharsets.UTF_8))
                || userId == null || !userId.matches("[1-9]\\d*")) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
            return;
        }
        request.setAttribute(USER_ID_ATTRIBUTE, Long.parseLong(userId));
        chain.doFilter(request, response);
    }
}
