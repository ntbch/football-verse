package com.footballverse.prediction.dto;

public record FixtureResponse(
        long id,
        String fixtureId,
        String leagueSlug,
        String round,
        String homeTeam,
        String awayTeam,
        String kickoff,
        Integer homeScore,
        Integer awayScore,
        String status,
        PredictionResponse userPrediction
) {}
