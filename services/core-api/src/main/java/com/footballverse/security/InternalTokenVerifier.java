package com.footballverse.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class InternalTokenVerifier {
    private final byte[] expectedToken;

    public InternalTokenVerifier(@Value("${app.internal.token}") String token) {
        if (token == null || token.length() < 24) {
            throw new IllegalArgumentException("Internal service token must contain at least 24 characters");
        }
        this.expectedToken = token.getBytes(StandardCharsets.UTF_8);
    }

    public boolean matches(String suppliedToken) {
        return suppliedToken != null && MessageDigest.isEqual(
                expectedToken,
                suppliedToken.getBytes(StandardCharsets.UTF_8)
        );
    }
}
