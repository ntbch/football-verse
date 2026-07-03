package com.footballverse.auth.dto;

import com.footballverse.user.UserRole;
import com.footballverse.user.UserStatus;

import java.util.Set;

public record CurrentUserResponse(
        Long id,
        String email,
        String username,
        UserStatus status,
        Set<UserRole> roles
) {
}
