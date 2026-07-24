package com.footballverse.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.user.model.UserAccount;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class JwtService {
    private final ObjectMapper objectMapper;
    private final byte[] secret;
    private final long accessTokenSeconds;
    private final String issuer;
    private final String audience;

    public JwtService(
            ObjectMapper objectMapper,
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-minutes}") long accessTokenMinutes,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.audience}") String audience,
            @Value("${app.environment:development}") String environment
    ) {
        validateConfiguration(secret, issuer, audience, environment);
        this.objectMapper = objectMapper;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.accessTokenSeconds = accessTokenMinutes * 60;
        this.issuer = issuer;
        this.audience = audience;
    }

    public String createAccessToken(UserAccount user) {
        Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", user.getEmail());
        payload.put("uid", user.getId());
        payload.put("roles", user.getRoles());
        payload.put("iss", issuer);
        payload.put("aud", audience);
        payload.put("exp", Instant.now().plusSeconds(accessTokenSeconds).getEpochSecond());

        String unsigned = encode(header) + "." + encode(payload);
        return unsigned + "." + sign(unsigned);
    }

    public String subject(String token) {
        Map<String, Object> payload = payload(token);
        Object subject = payload.get("sub");
        if (subject == null) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return subject.toString();
    }

    public Long userId(String token) {
        Map<String, Object> payload = payload(token);
        Object uid = payload.get("uid");
        if (uid == null) {
            throw new IllegalArgumentException("Missing JWT user id");
        }
        return ((Number) uid).longValue();
    }

    public boolean isValid(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return false;
            }
            Map<String, Object> header = decodePart(parts[0]);
            if (!"HS256".equals(header.get("alg")) || !"JWT".equals(header.get("typ"))) {
                return false;
            }
            byte[] suppliedSignature = Base64.getUrlDecoder().decode(parts[2]);
            if (!MessageDigest.isEqual(signBytes(parts[0] + "." + parts[1]), suppliedSignature)) {
                return false;
            }
            Map<String, Object> payload = decodePart(parts[1]);
            Object exp = payload.get("exp");
            return issuer.equals(payload.get("iss"))
                    && audience.equals(payload.get("aud"))
                    && payload.get("sub") instanceof String
                    && payload.get("uid") instanceof Number
                    && exp instanceof Number number
                    && number.longValue() > Instant.now().getEpochSecond();
        } catch (Exception exception) {
            return false;
        }
    }

    private Map<String, Object> payload(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3 || !isValid(token)) {
                throw new IllegalArgumentException("Invalid JWT");
            }
            return decodePart(parts[1]);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid JWT", exception);
        }
    }

    private String encode(Map<String, Object> value) {
        try {
            byte[] json = objectMapper.writeValueAsBytes(value);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(json);
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot encode JWT", exception);
        }
    }

    private String sign(String value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(signBytes(value));
    }

    private byte[] signBytes(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot sign JWT", exception);
        }
    }

    private Map<String, Object> decodePart(String value) throws Exception {
        byte[] json = Base64.getUrlDecoder().decode(value);
        return objectMapper.readValue(json, new TypeReference<>() { });
    }

    private static void validateConfiguration(String secret, String issuer, String audience, String environment) {
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
    }
}
