package com.footballverse.prediction.dto;

public record PredictionScoreLogResponse(
        Long id,
        Long predictionId,
        Long fixtureId,
        String homeTeam,
        String awayTeam,
        Integer homeScore,
        Integer awayScore,
        int points,
        int outcomePoints,
        int exactScorePoints,
        int ou25Points,
        int bttsPoints,
        String reason,
        String scoredAt
) {}
