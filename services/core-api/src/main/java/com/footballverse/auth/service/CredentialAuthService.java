package com.footballverse.auth.service;

import com.footballverse.auth.dto.AuthResponse;
import com.footballverse.auth.dto.LoginRequest;
import com.footballverse.auth.dto.RegisterRequest;
import com.footballverse.auth.dto.VerificationPendingResponse;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserProfile;
import com.footballverse.user.repository.UserAccountRepository;
import com.footballverse.user.repository.UserProfileRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Owns email/password credential flows: registration and login, including
 * throttle integration. Failure ordering is part of the contract: validation
 * throws happen BEFORE any mutation (register rejects a duplicate username
 * before saving; login records a throttle failure only after a password
 * mismatch and throws before touching sessions).
 */
@Service
@RequiredArgsConstructor
public class CredentialAuthService {
    private final UserAccountRepository users;
    private final UserProfileRepository profiles;
    private final PasswordEncoder passwordEncoder;
    private final AuthEmailFlowService emailFlows;
    private final AuthLoginThrottleService loginThrottle;
    private final TokenLifecycleService tokenLifecycle;

    @Transactional
    public VerificationPendingResponse register(RegisterRequest request, HttpServletRequest servletRequest) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        UserAccount existing = users.findByEmail(email).orElse(null);
        if (existing != null) {
            if (!existing.isEmailVerified() && existing.getPasswordHash() != null) {
                emailFlows.resumePendingRegistration(existing, email, servletRequest);
            }
            return new VerificationPendingResponse(email);
        }
        if (users.existsByUsername(request.username())) {
            throw new BadRequestException("Username already exists");
        }

        UserAccount user = users.save(new UserAccount(
                email,
                request.username(),
                passwordEncoder.encode(request.password())
        ));
        profiles.save(new UserProfile(user, request.username()));
        emailFlows.startRegistration(user, email, servletRequest);
        return new VerificationPendingResponse(email);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest servletRequest) {
        String input = request.email().trim();
        String accountKey = input.toLowerCase(Locale.ROOT);
        loginThrottle.checkLockout(accountKey, servletRequest);
        UserAccount user = users.findByEmail(accountKey)
                .orElseGet(() -> users.findByUsername(input).orElse(null));
        boolean passwordMatches = user != null
                && user.getPasswordHash() != null
                && passwordEncoder.matches(request.password(), user.getPasswordHash());
        if (!passwordMatches) {
            loginThrottle.recordFailure(accountKey, servletRequest);
            throw new BadRequestException("Invalid credentials");
        }
        if (!user.isEmailVerified()) {
            throw new BadRequestException("Invalid credentials");
        }
        return tokenLifecycle.issueTokens(user, null);
    }
}