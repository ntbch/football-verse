package com.footballverse.auth.service;

import com.footballverse.auth.dto.CurrentUserResponse;
import com.footballverse.auth.dto.GoogleAuthRequest;
import com.footballverse.auth.dto.LoginRequest;
import com.footballverse.auth.dto.RegisterRequest;
import com.footballverse.auth.dto.VerificationPendingResponse;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Thin facade over the split auth services, preserved because controllers and
 * tests depend on its public surface: credential flows delegate to
 * CredentialAuthService, Google sign-in to GoogleLoginService, and the
 * refresh-token session lifecycle to TokenLifecycleService.
 */
@Service
@RequiredArgsConstructor
public class AuthService {
    private final CredentialAuthService credentialAuth;
    private final GoogleLoginService googleLoginService;
    private final TokenLifecycleService tokenLifecycle;
    private final CurrentUser currentUser;
    private final UserAccountRepository users;

    @Transactional
    public VerificationPendingResponse register(RegisterRequest request, HttpServletRequest servletRequest) {
        return credentialAuth.register(request, servletRequest);
    }

    @Transactional
    public com.footballverse.auth.dto.AuthResponse login(LoginRequest request, HttpServletRequest servletRequest) {
        return credentialAuth.login(request, servletRequest);
    }

    public com.footballverse.auth.dto.AuthResponse googleLogin(GoogleAuthRequest request) {
        return googleLoginService.googleLogin(request);
    }

    @Transactional
    public com.footballverse.auth.dto.AuthResponse refresh(String token) {
        return tokenLifecycle.refresh(token);
    }

    @Transactional
    public void logout(String token) {
        tokenLifecycle.logout(token);
    }

    @Transactional
    public void revokeAllSessions() {
        tokenLifecycle.revokeAllSessions();
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse me() {
        UserAccount user = currentUser.get();
        return new CurrentUserResponse(user.getId(), user.getEmail(), user.getUsername(), user.getStatus(), user.getRoles());
    }
}