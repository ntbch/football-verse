package com.footballverse.game.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class InternalGatewayFilterTest {
    private final InternalGatewayFilter filter = new InternalGatewayFilter("trusted-token");

    @Test
    void acceptsTrustedGatewayHeaders() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/game/status");
        request.addHeader("X-Internal-Token", "trusted-token");
        request.addHeader("X-User-Id", "42");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(request.getAttribute(InternalGatewayFilter.USER_ID_ATTRIBUTE)).isEqualTo(42L);
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
}
