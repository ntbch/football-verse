package com.footballverse.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.user.UserAccount;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class JwtService {
    private final ObjectMapper objectMapper;
    private final byte[] secret;
    private final long accessTokenSeconds;

    public JwtService(
            ObjectMapper objectMapper,
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-minutes}") long accessTokenMinutes
    ) {
        this.objectMapper = objectMapper;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.accessTokenSeconds = accessTokenMinutes * 60;
    }

    public String createAccessToken(UserAccount user) {
        Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", user.getEmail());
        payload.put("uid", user.getId());
        payload.put("roles", user.getRoles());
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

    public boolean isValid(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return false;
        }
        if (!sign(parts[0] + "." + parts[1]).equals(parts[2])) {
            return false;
        }
        Object exp = payload(token).get("exp");
        return exp instanceof Number number && number.longValue() > Instant.now().getEpochSecond();
    }

    private Map<String, Object> payload(String token) {
        try {
            String[] parts = token.split("\\.");
            byte[] json = Base64.getUrlDecoder().decode(parts[1]);
            return objectMapper.readValue(json, new TypeReference<>() {
            });
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
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot sign JWT", exception);
        }
    }
}
