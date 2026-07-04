package com.footballverse;

import com.footballverse.auth.AuthService;
import com.footballverse.auth.dto.LoginRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = "app.crawl.startup-enabled=false")
public class LoginTest {
    @Autowired
    private AuthService authService;

    @Test
    public void testLogin() {
        try {
            authService.login(new LoginRequest("admin@footballverse.local", "ChangeMe123!"));
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }
}
