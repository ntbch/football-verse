package com.footballverse.user.admin.dto;

import com.footballverse.user.model.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(@NotNull UserStatus status) {
}
