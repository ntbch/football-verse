package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record Tactic(
    Mentality mentality,
    Tempo tempo,
    Width width,
    PassingStyle passingStyle,
    Pressing pressing,
    DefensiveLine defensiveLine,
    Transition transition,
    TimeWasting timeWasting
) {}
