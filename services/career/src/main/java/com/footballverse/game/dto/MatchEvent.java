package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.util.Map;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record MatchEvent(
    int sequence,
    int minute,
    int second,
    EventType type,
    UUID teamId,
    UUID playerId,
    Zone zone,
    Map<String, Object> payload
) {}
