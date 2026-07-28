package com.footballverse.prediction.dto;

public record StandingResponse(
        int rank,
        String teamId,
        String teamName,
        String teamLogo,
        int points,
        int played,
        Integer wins,
        Integer draws,
        Integer losses,
        Integer goalsFor,
        Integer goalsAgainst,
        Integer goalDifference
) {}
