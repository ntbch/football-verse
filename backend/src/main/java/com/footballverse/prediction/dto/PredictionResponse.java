package com.footballverse.prediction.dto;

public record PredictionResponse(
        long id,
        long matchId,
        String pick,
        Integer homeScore,
        Integer awayScore,
        int points,
        boolean correct,
        Boolean correctOutcome,
        Boolean correctExactScore,
        Boolean correctOu25,
        Boolean correctBtts,
        String pickOu25,
        String pickBtts
) {}
