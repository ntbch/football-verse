package com.footballverse.game.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class InternalGatewayFilterTest {
    private static final String SECRET = "test-jwt-secret-key-with-at-least-32-characters";
    private final JwtVerifier jwtVerifier = new JwtVerifier(
            new ObjectMapper(), SECRET, "football-verse-core", "football-verse-api", "test"
    );
    private final InternalGatewayFilter filter = new InternalGatewayFilter("trusted-token", jwtVerifier, true);

    @Test
    void acceptsTrustedGatewayHeaders() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/game/status");
        request.addHeader("X-Internal-Token", "trusted-token");
        request.addHeader("X-User-Id", "42");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(request.getAttribute(InternalGatewayFilter.USER_ID_ATTRIBUTE)).isEqualTo(42L);
        assertThat(response.getHeader("X-Auth-Compatibility")).isEqualTo("legacy-header");
    }

    @Test
    void rejectsForgedGatewayHeaders() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/game/status");
        request.addHeader("X-Internal-Token", "forged");
        request.addHeader("X-User-Id", "42");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
    }

    @Test
    void rejectsLegacyHeadersFromPublicAddress() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/game/status");
        request.setRemoteAddr("203.0.113.10");
        request.addHeader("X-Internal-Token", "trusted-token");
        request.addHeader("X-User-Id", "42");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
    }

    @Test
    void productionModeCanDisableLegacyHeaders() throws Exception {
        InternalGatewayFilter strictFilter = new InternalGatewayFilter("trusted-token", jwtVerifier, false);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/game/status");
        request.addHeader("X-Internal-Token", "trusted-token");
        request.addHeader("X-User-Id", "42");
        MockHttpServletResponse response = new MockHttpServletResponse();

        strictFilter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
    }

    @Test
    void bearerPathRequiresServiceCredentialAndDerivesUserFromJwt() throws Exception {
        String validToken = JwtVerifierTest.token("football-verse-core", "football-verse-api", 60);
        InternalGatewayFilter bearerFilter = new InternalGatewayFilter("trusted-token", jwtVerifier, true);

        MockHttpServletRequest missingServiceCredential = new MockHttpServletRequest("GET", "/game/status");
        missingServiceCredential.addHeader("Authorization", "Bearer " + validToken);
        missingServiceCredential.addHeader("X-User-Id", "999");
        MockHttpServletResponse rejected = new MockHttpServletResponse();
        bearerFilter.doFilter(missingServiceCredential, rejected, new MockFilterChain());
        assertThat(rejected.getStatus()).isEqualTo(401);

        MockHttpServletRequest accepted = new MockHttpServletRequest("GET", "/game/status");
        accepted.addHeader("Authorization", "Bearer " + validToken);
        accepted.addHeader("X-Internal-Token", "trusted-token");
        accepted.addHeader("X-User-Id", "999");
        MockHttpServletResponse response = new MockHttpServletResponse();
        bearerFilter.doFilter(accepted, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(accepted.getAttribute(InternalGatewayFilter.USER_ID_ATTRIBUTE)).isEqualTo(42L);
    }
}
