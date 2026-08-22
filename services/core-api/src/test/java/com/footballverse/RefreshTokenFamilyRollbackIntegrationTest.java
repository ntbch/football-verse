package com.footballverse;

import com.footballverse.auth.dto.AuthResponse;
import com.footballverse.auth.dto.LoginRequest;
import com.footballverse.auth.model.RefreshToken;
import com.footballverse.auth.repository.RefreshTokenRepository;
import com.footballverse.auth.service.AuthService;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Regression test for the production rollback path of refresh-token reuse
 * detection: the family-wide revocation must COMMIT even though refresh()
 * then rejects the replay with an exception that rolls back its own
 * transaction. Deliberately NOT @Transactional — every call here runs in
 * its own committed transaction, exactly like real requests.
 */
@SpringBootTest
@TestPropertySource(properties = "app.crawl.startup-enabled=false")
public class RefreshTokenFamilyRollbackIntegrationTest {
    @Autowired
    private AuthService authService;
    @Autowired
    private UserAccountRepository users;
    @Autowired
    private RefreshTokenRepository refreshTokens;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    public void familyRevocationSurvivesTheReplayException() {
        String email = "family-rollback-" + UUID.randomUUID() + "@example.test";
        UserAccount user = new UserAccount(email, "family_rollback", passwordEncoder.encode("TestPassword123!"));
        user.setEmailVerified(true);
        users.save(user);

        AuthResponse first = authService.login(new LoginRequest(email, "TestPassword123!"), new MockHttpServletRequest());
        AuthResponse rotated = authService.refresh(first.refreshToken());

        // Replay of the rotated-away token: rejected, and its own transaction
        // rolls back — but the family revocation must have committed already.
        assertThrows(BadRequestException.class, () -> authService.refresh(first.refreshToken()));

        RefreshToken newest = refreshTokens.findByTokenHash(sha256(rotated.refreshToken())).orElseThrow();
        assertNotNull(newest.getRevokedAt(),
                "family revocation must survive the replay rejection rollback");
    }

    private static String sha256(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
