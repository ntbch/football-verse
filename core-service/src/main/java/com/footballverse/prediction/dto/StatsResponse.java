package com.footballverse.prediction.dto;

import java.util.List;

public record StatsResponse(
        int totalPoints,
        int correctPicks,
        int totalPicks,
        int currentStreak,
        int bestStreak,
        List<BadgeResponse> badges
) {}
