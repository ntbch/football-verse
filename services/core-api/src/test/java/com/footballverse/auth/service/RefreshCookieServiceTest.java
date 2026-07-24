package com.footballverse.auth.service;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockCookie;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RefreshCookieServiceTest {
    @Test
    void createsHttpOnlyCookieAndResolvesItFromRequest() {
        RefreshCookieService service = new RefreshCookieService(
                "football_verse_refresh", false, "Lax", 30, "test"
        );
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new MockCookie("football_verse_refresh", "cookie-token"));

        assertThat(service.create("cookie-token").toString())
                .contains("HttpOnly", "SameSite=Lax", "Path=/api/v1/auth", "Max-Age=2592000")
                .doesNotContain("Secure");
        assertThat(service.resolve(request)).isEqualTo("cookie-token");
        assertThat(service.clear().toString()).contains("Max-Age=0", "HttpOnly");
    }

    @Test
    void returnsNullWhenCookieIsMissing() {
        RefreshCookieService service = new RefreshCookieService(
                "football_verse_refresh", false, "Lax", 30, "test"
        );
        assertThat(service.resolve(new MockHttpServletRequest())).isNull();
    }

    @Test
    void productionAndSameSiteNoneRequireSecureCookie() {
        assertThatThrownBy(() -> new RefreshCookieService(
                "football_verse_refresh", false, "Lax", 30, "production"
        )).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new RefreshCookieService(
                "football_verse_refresh", false, "None", 30, "test"
        )).isInstanceOf(IllegalArgumentException.class);
    }
}
