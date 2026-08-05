package com.footballverse.user.admin.dto;

import com.footballverse.user.model.UserRole;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;
import jakarta.validation.constraints.Size;

public record UpdateUserRoleRequest(@NotEmpty Set<UserRole> roles, @Size(max = 300) String reason) {
}
