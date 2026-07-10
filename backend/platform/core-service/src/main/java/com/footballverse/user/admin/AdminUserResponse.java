package com.footballverse.user.admin;

import com.footballverse.user.model.UserRole;
import com.footballverse.user.model.UserStatus;

import java.util.Set;

public record AdminUserResponse(Long id, String email, String username, UserStatus status, Set<UserRole> roles) {
}
