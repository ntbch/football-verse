package com.footballverse.user.dto;

import java.time.Instant;
import java.util.List;

public record AccountExportResponse(
        Long userId,
        String email,
        String username,
        String status,
        Instant createdAt,
        ProfileResponse profile,
        List<FollowTargetResponse> follows,
        NotificationPreferencesResponse notificationPreferences
) {}
