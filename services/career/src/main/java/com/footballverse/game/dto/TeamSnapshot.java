package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeamSnapshot(
    UUID id,
    String name,
    List<PlayerSnapshot> players,
    Lineup lineup,
    Tactic tactic,
    ManagerPlan managerPlan,
    Set<UUID> inactivePlayerIds
) {
    public TeamSnapshot {
        inactivePlayerIds = inactivePlayerIds == null ? Set.of() : Set.copyOf(inactivePlayerIds);
    }

    public TeamSnapshot(UUID id, String name, List<PlayerSnapshot> players, Lineup lineup, Tactic tactic) {
        this(id, name, players, lineup, tactic, null, Set.of());
    }

    public TeamSnapshot(UUID id, String name, List<PlayerSnapshot> players, Lineup lineup, Tactic tactic,
                        ManagerPlan managerPlan) {
        this(id, name, players, lineup, tactic, managerPlan, Set.of());
    }
}
