package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.util.List;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record MatchResult(
    long seed,
    String engineVersion,
    String rulesetVersion,
    UUID homeTeamId,
    UUID awayTeamId,
    int homeScore,
    int awayScore,
    List<MatchEvent> events,
    MatchStats stats
) {}
