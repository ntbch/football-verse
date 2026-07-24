package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PlayerAttributes(
    int passing,
    int firstTouch,
    int dribbling,
    int tackling,
    int finishing,
    int pace,
    int strength,
    int stamina,
    int aerial,
    int decisions,
    int positioning,
    int composure,
    int aggression,
    int teamwork,
    int handling,
    int reflexes,
    int oneOnOne,
    int distribution
) {}
