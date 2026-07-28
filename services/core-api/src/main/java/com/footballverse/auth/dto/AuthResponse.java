package com.footballverse.auth.dto;

import com.footballverse.user.model.UserRole;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.Set;

public record AuthResponse(
        String accessToken,
        @JsonIgnore String refreshToken,
        Long userId,
        String email,
        String username,
        Set<UserRole> roles
) {
}
