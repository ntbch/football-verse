package com.footballverse.user.admin.dto;

import com.footballverse.user.model.UserRole;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public record UpdateUserRoleRequest(@NotEmpty Set<UserRole> roles) {
}
