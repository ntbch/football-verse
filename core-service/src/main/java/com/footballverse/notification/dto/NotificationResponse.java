package com.footballverse.notification.dto;

import com.footballverse.notification.NotificationType;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        NotificationType type,
        String message,
        String linkUrl,
        boolean read,
        Instant createdAt
) {
}
