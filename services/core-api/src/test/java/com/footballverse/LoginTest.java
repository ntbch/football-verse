package com.footballverse;

import com.footballverse.auth.service.AuthService;
import com.footballverse.auth.dto.LoginRequest;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserAccountRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
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

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @Transactional
    public void testLogin() {
        String email = "login-service@example.test";
        String password = "TestPassword123!";
        UserAccount user = new UserAccount(email, "login_service_test", passwordEncoder.encode(password));
        user.setEmailVerified(true);
        users.save(user);
        try {
            authService.login(new LoginRequest(email, password));
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }
}
