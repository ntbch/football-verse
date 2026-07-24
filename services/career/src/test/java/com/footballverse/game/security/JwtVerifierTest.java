package com.footballverse.game.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtVerifierTest {
    private static final String SECRET = "test-jwt-secret-key-with-at-least-32-characters";

    @Test
    void acceptsBoundTokenAndRejectsWrongClaimsOrExpiry() throws Exception {
        JwtVerifier verifier = verifier("football-verse-core", "football-verse-api");

        assertThat(verifier.verifiedUserId(token("football-verse-core", "football-verse-api", 60))).isEqualTo(42L);
        assertThatThrownBy(() -> verifier.verifiedUserId(token("wrong", "football-verse-api", 60)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> verifier.verifiedUserId(token("football-verse-core", "wrong", 60)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> verifier.verifiedUserId(token("football-verse-core", "football-verse-api", -60)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new JwtVerifier(
                new ObjectMapper(),
                "different-test-secret-with-at-least-32-characters",
                "football-verse-core",
                "football-verse-api",
                "test"
        ).verifiedUserId(token("football-verse-core", "football-verse-api", 60)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void productionRejectsDevelopmentSecret() {
        assertThatThrownBy(() -> new JwtVerifier(
                new ObjectMapper(),
                "dev-secret-change-me-dev-secret-change-me",
                "football-verse-core",
                "football-verse-api",
                "production"
        )).isInstanceOf(IllegalArgumentException.class);
    }

    private JwtVerifier verifier(String issuer, String audience) {
        return new JwtVerifier(new ObjectMapper(), SECRET, issuer, audience, "test");
    }

    static String token(String issuer, String audience, long expiresInSeconds) throws Exception {
        String header = encode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = encode(("""
                {"sub":"manager@example.test","uid":42,"iss":"%s","aud":"%s","exp":%d}
                """).formatted(issuer, audience, Instant.now().plusSeconds(expiresInSeconds).getEpochSecond()));
        String unsigned = header + "." + payload;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return unsigned + "." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mac.doFinal(unsigned.getBytes(StandardCharsets.UTF_8)));
    }

    private static String encode(String value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }
}
