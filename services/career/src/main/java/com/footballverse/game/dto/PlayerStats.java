package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PlayerStats(
    UUID playerId,
    UUID teamId,
    int minutes,
    double rating,
    int goals,
    int assists,
    int shots,
    int passesAttempted,
    int passesCompleted,
    int tackles
) {}
