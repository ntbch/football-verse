package com.footballverse.auth.dto;

import com.footballverse.user.model.UserRole;

import java.util.Set;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String email,
        String username,
        Set<UserRole> roles
) {
}
