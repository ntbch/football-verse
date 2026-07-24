package com.footballverse.game.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

@Component
public class JwtVerifier {
    private final ObjectMapper objectMapper;
    private final byte[] secret;
    private final String issuer;
    private final String audience;

    public JwtVerifier(
            ObjectMapper objectMapper,
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.audience}") String audience,
            @Value("${app.environment:development}") String environment
    ) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalArgumentException("JWT secret must contain at least 32 characters");
        }
        if (issuer == null || issuer.isBlank() || audience == null || audience.isBlank()) {
            throw new IllegalArgumentException("JWT issuer and audience are required");
        }
        if ("production".equalsIgnoreCase(environment)
                && "dev-secret-change-me-dev-secret-change-me".equals(secret)) {
            throw new IllegalArgumentException("Development JWT secret is forbidden in production");
        }
        this.objectMapper = objectMapper;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.issuer = issuer;
        this.audience = audience;
    }

    public long verifiedUserId(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("Invalid JWT");
            }
            Map<String, Object> header = decode(parts[0]);
            Map<String, Object> payload = decode(parts[1]);
            byte[] suppliedSignature = Base64.getUrlDecoder().decode(parts[2]);
            Object expiresAt = payload.get("exp");
            if (!"HS256".equals(header.get("alg"))
                    || !"JWT".equals(header.get("typ"))
                    || !MessageDigest.isEqual(sign(parts[0] + "." + parts[1]), suppliedSignature)
                    || !issuer.equals(payload.get("iss"))
                    || !audience.equals(payload.get("aud"))
                    || !(payload.get("sub") instanceof String)
                    || !(payload.get("uid") instanceof Number userId)
                    || !(expiresAt instanceof Number expiry)
                    || expiry.longValue() <= Instant.now().getEpochSecond()) {
                throw new IllegalArgumentException("Invalid JWT");
            }
            return userId.longValue();
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid JWT", exception);
        }
    }

    private Map<String, Object> decode(String value) throws Exception {
        return objectMapper.readValue(Base64.getUrlDecoder().decode(value), new TypeReference<>() { });
    }

    private byte[] sign(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }
}
