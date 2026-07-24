package com.footballverse.prediction.dto;

import java.util.List;

public record AiPredictionSummary(
        int homePct,
        int drawPct,
        int awayPct,
        String pick,
        String pickLabel,
        String correctScore,
        double averageGoals,
        int confidence,
        String overUnder25,
        String bothTeamsToScore,
        List<String> homeForm,
        List<String> awayForm,
        String trend
) {}