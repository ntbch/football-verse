package com.footballverse;

import com.footballverse.auth.dto.LoginRequest;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.crawl.startup-enabled=false")
public class LoginApiTest {
    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    public void testLoginApi() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "login-api-" + suffix + "@example.test";
        String password = "TestPassword123!";
        UserAccount user = new UserAccount(email, "login_api_" + suffix, passwordEncoder.encode(password));
        user.setEmailVerified(true);
        users.save(user);

        LoginRequest request = new LoginRequest(email, password);
        ResponseEntity<String> response = restTemplate.postForEntity("/auth/login", request, String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode(), response.getBody());

        String refreshCookie = response.getHeaders().getOrEmpty(HttpHeaders.SET_COOKIE).stream()
                .filter(value -> value.startsWith("football_verse_refresh="))
                .findFirst()
                .orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(refreshCookie.contains("HttpOnly"));
        org.junit.jupiter.api.Assertions.assertTrue(refreshCookie.contains("SameSite=Lax"));

        HttpHeaders cookieHeaders = new HttpHeaders();
        cookieHeaders.setContentType(MediaType.APPLICATION_JSON);
        cookieHeaders.set(HttpHeaders.COOKIE, refreshCookie.split(";", 2)[0]);
        ResponseEntity<String> refreshed = restTemplate.exchange(
                "/auth/refresh",
                HttpMethod.POST,
                new HttpEntity<>("{}", cookieHeaders),
                String.class
        );
        assertEquals(HttpStatus.OK, refreshed.getStatusCode());
        org.junit.jupiter.api.Assertions.assertFalse(refreshed.getHeaders().getOrEmpty(HttpHeaders.SET_COOKIE).isEmpty());
    }
}
