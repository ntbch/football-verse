package com.footballverse;

import com.footballverse.auth.service.AuthService;
import com.footballverse.auth.dto.LoginRequest;
import com.footballverse.auth.dto.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@TestPropertySource(properties = "app.crawl.startup-enabled=false")
public class LoginTest {
    @Autowired
    private AuthService authService;

    @Test
    @Transactional
    public void testLogin() {
        String email = "login-service@example.test";
        String password = "TestPassword123!";
        authService.register(new RegisterRequest(email, "login_service_test", password));
        try {
            authService.login(new LoginRequest(email, password));
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }
}
