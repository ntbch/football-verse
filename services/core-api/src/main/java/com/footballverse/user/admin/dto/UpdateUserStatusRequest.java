package com.footballverse.user.admin.dto;

import com.footballverse.user.model.UserStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateUserStatusRequest(@NotNull UserStatus status, @Size(max = 300) String reason) {
}
