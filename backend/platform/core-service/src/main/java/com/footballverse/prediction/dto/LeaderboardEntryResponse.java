package com.footballverse.prediction.dto;

public record LeaderboardEntryResponse(
        long userId,
        String username,
        String displayName,
        String avatarUrl,
        int points,
        long correctPicks,
        long totalPicks,
        int rank
) {}
