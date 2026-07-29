package com.footballverse.prediction.dto;

public record CurrentLeaderboardResponse(
        String period,
        Integer rank,
        int points,
        long correctPicks,
        long totalPicks,
        int accuracy
) {}
