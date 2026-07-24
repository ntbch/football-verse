package com.footballverse.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.user.model.UserAccount;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {
    private static final String SECRET = "test-jwt-secret-key-with-at-least-32-characters";

    @Test
    void createsAndValidatesIssuerAudienceBoundToken() {
        JwtService service = service("football-verse-core", "football-verse-api");
        UserAccount user = new UserAccount("manager@example.test", "manager", "hash");
        user.setId(42L);

        String token = service.createAccessToken(user);

        assertThat(service.isValid(token)).isTrue();
        assertThat(service.subject(token)).isEqualTo("manager@example.test");
        assertThat(service.userId(token)).isEqualTo(42L);
        assertThat(service("wrong-issuer", "football-verse-api").isValid(token)).isFalse();
        assertThat(service("football-verse-core", "wrong-audience").isValid(token)).isFalse();
        assertThat(new JwtService(
                new ObjectMapper(),
                "different-test-secret-with-at-least-32-characters",
                30,
                "football-verse-core",
                "football-verse-api",
                "test"
        ).isValid(token)).isFalse();
    }

    @Test
    void rejectsExpiredAndAlgorithmConfusionTokens() throws Exception {
        JwtService service = service("football-verse-core", "football-verse-api");
        String expiredPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(("""
                {"sub":"manager@example.test","uid":42,"iss":"football-verse-core","aud":"football-verse-api","exp":%d}
                """).formatted(Instant.now().minusSeconds(60).getEpochSecond()).getBytes(StandardCharsets.UTF_8));
        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

        assertThat(service.isValid(header + "." + expiredPayload + ".ignored")).isFalse();
    }

    @Test
    void productionRejectsDevelopmentOrWeakSecrets() {
        assertThatThrownBy(() -> new JwtService(
                new ObjectMapper(),
                "dev-secret-change-me-dev-secret-change-me",
                30,
                "football-verse-core",
                "football-verse-api",
                "production"
        )).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new JwtService(
                new ObjectMapper(), "short", 30, "issuer", "audience", "development"
        )).isInstanceOf(IllegalArgumentException.class);
    }

    private JwtService service(String issuer, String audience) {
        return new JwtService(new ObjectMapper(), SECRET, 30, issuer, audience, "test");
    }
}
