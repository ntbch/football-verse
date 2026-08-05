package com.footballverse.security;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InternalTokenAuthenticationFilterTest {
    private final InternalTokenAuthenticationFilter filter = new InternalTokenAuthenticationFilter(
            new InternalTokenVerifier("internal-test-token-with-24-characters")
    );

    @Test
    void rejectsMissingAndWrongTokensForInternalRoutes() throws ServletException, IOException {
        for (String token : new String[]{null, "wrong-token"}) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internal/news-sources");
            if (token != null) request.addHeader("X-Internal-Token", token);
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            filter.doFilter(request, response, chain);

            assertEquals(401, response.getStatus());
            assertTrue(chain.getRequest() == null);
        }
    }

    @Test
    void acceptsValidTokenAndLeavesPublicRoutesAlone() throws ServletException, IOException {
        MockHttpServletRequest internal = new MockHttpServletRequest("GET", "/internal/news-sources");
        internal.addHeader("X-Internal-Token", "internal-test-token-with-24-characters");
        MockFilterChain internalChain = new MockFilterChain();
        filter.doFilter(internal, new MockHttpServletResponse(), internalChain);
        assertTrue(internalChain.getRequest() != null);

        MockFilterChain publicChain = new MockFilterChain();
        filter.doFilter(new MockHttpServletRequest("GET", "/news"), new MockHttpServletResponse(), publicChain);
        assertTrue(publicChain.getRequest() != null);
    }
}
