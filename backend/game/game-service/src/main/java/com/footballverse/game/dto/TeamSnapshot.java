package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.util.List;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeamSnapshot(
    UUID id,
    String name,
    List<PlayerSnapshot> players,
    Lineup lineup,
    Tactic tactic
) {}
