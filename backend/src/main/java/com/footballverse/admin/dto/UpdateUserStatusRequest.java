package com.footballverse.admin.dto;

import com.footballverse.user.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(@NotNull UserStatus status) {
}
