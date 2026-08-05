package com.footballverse.moderation.dto;

import java.time.Instant;

public record ModerationAuditLogResponse(
        Long id,
        Long actorId,
        String action,
        String targetType,
        Long targetId,
        String reason,
        Instant createdAt
) {}
