package com.footballverse.prediction.dto;

import java.util.List;

public record MatchCentreFixture(
        long id,
        String fixtureId,
        String league,
        String round,
        String status,
        String kickoff,
        String homeTeam,
        String awayTeam,
        String homeLogo,
        String awayLogo,
        Integer homeScore,
        Integer awayScore,
        AiPredictionSummary aiPrediction,
        PredictionResponse userPrediction
) {}