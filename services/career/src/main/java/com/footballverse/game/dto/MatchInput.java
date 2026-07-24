package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record MatchInput(
    long seed,
    String engineVersion,
    String rulesetVersion,
    TeamSnapshot home,
    TeamSnapshot away
) {}
