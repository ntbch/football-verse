package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.util.Set;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PlayerSnapshot(
    UUID id,
    String name,
    Position primaryPosition,
    Set<Position> secondaryPositions,
    PlayerAttributes attributes,
    PlayerAvailability availability,
    double fitness,
    double morale,
    double form
) {}
