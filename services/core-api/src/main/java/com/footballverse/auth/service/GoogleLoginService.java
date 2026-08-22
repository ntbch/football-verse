package com.footballverse.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.footballverse.auth.dto.AuthResponse;
import com.footballverse.auth.dto.GoogleAuthRequest;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserProfile;
import com.footballverse.user.repository.UserAccountRepository;
import com.footballverse.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.Locale;

/**
 * Owns Google sign-in: out-of-transaction upstream token verification followed
 * by a programmatic transaction for account linking/creation, so a slow or
 * hung upstream call can never hold a database connection.
 */
@Service
@RequiredArgsConstructor
public class GoogleLoginService {
    private final UserAccountRepository users;
    private final UserProfileRepository profiles;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final TokenLifecycleService tokenLifecycle;
    private final org.springframework.transaction.PlatformTransactionManager transactionManager;

    public AuthResponse googleLogin(GoogleAuthRequest request) {
        // Network verification happens outside any transaction so a slow or
        // hung upstream call can never hold a servlet thread with a database
        // connection open.
        JsonNode payload = googleTokenVerifier.verify(request.idToken());
        var tx = new TransactionTemplate(transactionManager);
        return tx.execute(status -> completeGoogleLogin(payload));
    }

    private AuthResponse completeGoogleLogin(JsonNode payload) {
        String googleId = payload.get("sub").asText();
        String email = payload.get("email").asText().toLowerCase(Locale.ROOT);
        String name = payload.has("name") ? payload.get("name").asText() : email.split("@")[0];

        // Find by googleId first, then by email
        UserAccount user = users.findByGoogleId(googleId).orElse(null);

        if (user == null) {
            user = users.findByEmail(email).orElse(null);
            if (user != null) {
                // Link Google account to existing user
                user.setGoogleId(googleId);
                if (!user.isEmailVerified()) {
                    user.setEmailVerified(true);
                    user.setEmailVerifiedAt(Instant.now());
                }
            } else {
                // Create new user
                String username = generateUniqueUsername(name);
                user = users.save(new UserAccount(email, username, googleId, true));
                profiles.save(new UserProfile(user, name));
            }
        }

        return tokenLifecycle.issueTokens(user, null);
    }

    private String generateUniqueUsername(String name) {
        String base = name.toLowerCase().replaceAll("[^a-z0-9]", "");
        if (base.isBlank()) base = "user";
        if (base.length() > 20) base = base.substring(0, 20);
        String candidate = base;
        int suffix = 1;
        while (users.existsByUsername(candidate)) {
            candidate = base + suffix++;
        }
        return candidate;
    }
}