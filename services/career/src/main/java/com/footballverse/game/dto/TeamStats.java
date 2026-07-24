package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeamStats(
    UUID teamId,
    int goals,
    int shots,
    int shotsOnTarget,
    double xg,
    double possession,
    int passesAttempted,
    int passesCompleted,
    int fouls,
    int yellowCards,
    int redCards
) {}
