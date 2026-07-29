package com.footballverse.user.dto;

import com.footballverse.user.model.FollowTargetType;

import java.time.Instant;

public record FollowTargetResponse(
        FollowTargetType targetType,
        String targetKey,
        String targetName,
        boolean following,
        Instant createdAt
) {}
