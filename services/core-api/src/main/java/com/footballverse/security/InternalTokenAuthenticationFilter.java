package com.footballverse.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class InternalTokenAuthenticationFilter extends OncePerRequestFilter {
    private final InternalTokenVerifier verifier;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!request.getRequestURI().startsWith(request.getContextPath() + "/internal/")) {
            chain.doFilter(request, response);
            return;
        }
        if (!verifier.matches(request.getHeader("X-Internal-Token"))) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"success\":false,\"message\":\"Unauthorized\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
