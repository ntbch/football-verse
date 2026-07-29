package com.footballverse.auth.controller;
import com.footballverse.auth.service.AuthService;

import com.footballverse.auth.dto.AuthResponse;
import com.footballverse.auth.dto.CurrentUserResponse;
import com.footballverse.auth.dto.GoogleAuthRequest;
import com.footballverse.auth.dto.LoginRequest;
import com.footballverse.auth.dto.RegisterRequest;
import com.footballverse.auth.dto.EmailRequest;
import com.footballverse.auth.dto.PasswordResetRequest;
import com.footballverse.auth.dto.TokenRequest;
import com.footballverse.auth.dto.VerificationPendingResponse;
import com.footballverse.common.response.ApiResponse;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.auth.service.RefreshCookieService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpHeaders;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final RefreshCookieService refreshCookieService;
    private final com.footballverse.auth.service.AuthEmailFlowService emailFlows;

    @Value("${app.cors-origin:http://localhost:3000}")
    private String browserOrigin;

    @PostMapping("/register")
    public ApiResponse<VerificationPendingResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest servletRequest
    ) {
        return ApiResponse.ok("If eligible, an email will arrive shortly.", authService.register(request, servletRequest));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        return withRefreshCookie(authService.login(request), response);
    }

    @PostMapping("/google")
    public ApiResponse<AuthResponse> googleLogin(@Valid @RequestBody GoogleAuthRequest request, HttpServletResponse response) {
        return withRefreshCookie(authService.googleLogin(request), response);
    }

    @PostMapping("/verify-email")
    public ApiResponse<Void> verifyEmail(@Valid @RequestBody TokenRequest request) {
        emailFlows.verifyEmail(request.token());
        return ApiResponse.ok("Email verified. You can now sign in.", null);
    }

    @PostMapping("/resend-verification")
    public ApiResponse<Void> resendVerification(
            @Valid @RequestBody EmailRequest request,
            HttpServletRequest servletRequest
    ) {
        emailFlows.resendVerification(request.email(), servletRequest);
        return ApiResponse.ok("If eligible, an email will arrive shortly.", null);
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(
            @Valid @RequestBody EmailRequest request,
            HttpServletRequest servletRequest
    ) {
        emailFlows.requestPasswordReset(request.email(), servletRequest);
        return ApiResponse.ok("If eligible, an email will arrive shortly.", null);
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody PasswordResetRequest request) {
        emailFlows.resetPassword(request.token(), request.password());
        return ApiResponse.ok("Password reset. Please sign in.", null);
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        requireBrowserOrigin(request);
        String refreshToken = requiredRefreshToken(refreshCookieService.resolve(request));
        return withRefreshCookie(authService.refresh(refreshToken), response);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        requireBrowserOrigin(request);
        String refreshToken = refreshCookieService.resolve(request);
        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken);
        }
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookieService.clear().toString());
        return ApiResponse.ok("Logged out", null);
    }

    @GetMapping("/me")
    public ApiResponse<CurrentUserResponse> me() {
        return ApiResponse.ok(authService.me());
    }

    private ApiResponse<AuthResponse> withRefreshCookie(AuthResponse auth, HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookieService.create(auth.refreshToken()).toString());
        return ApiResponse.ok(auth);
    }

    private String requiredRefreshToken(String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Refresh token is required");
        }
        return token;
    }

    private void requireBrowserOrigin(HttpServletRequest request) {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (origin != null && !browserOrigin.equals(origin)) {
            throw new BadRequestException("Invalid browser origin");
        }
    }
}
