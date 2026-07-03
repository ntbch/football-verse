package com.footballverse.admin.dto;

import com.footballverse.user.UserRole;
import com.footballverse.user.UserStatus;

import java.util.Set;

public record AdminUserResponse(Long id, String email, String username, UserStatus status, Set<UserRole> roles) {
}
