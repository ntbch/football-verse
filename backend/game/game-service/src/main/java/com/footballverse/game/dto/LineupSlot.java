package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record LineupSlot(
    UUID playerId,
    Position position,
    PlayerRole role,
    Duty duty
) {
    public LineupSlot(UUID playerId, Position position, PlayerRole role) {
        this(playerId, position, role, switch (role) {
            case GOALKEEPER, ANCHOR -> Duty.DEFEND;
            case POACHER -> Duty.ATTACK;
            default -> Duty.SUPPORT;
        });
    }
}
