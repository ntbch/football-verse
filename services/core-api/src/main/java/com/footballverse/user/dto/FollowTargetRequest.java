package com.footballverse.user.dto;

import com.footballverse.user.model.FollowTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FollowTargetRequest(
        @NotNull FollowTargetType targetType,
        @NotBlank @Size(max = 120) String targetKey,
        @NotBlank @Size(max = 120) String targetName,
        boolean following
) {}
