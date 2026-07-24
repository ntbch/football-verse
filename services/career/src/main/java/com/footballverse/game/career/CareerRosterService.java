package com.footballverse.game.career;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class CareerRosterService {
    private static final Position[] FORMATION = {
        Position.GK, Position.LB, Position.CB, Position.CB, Position.RB,
        Position.CM, Position.CM, Position.CM, Position.LW, Position.RW, Position.ST
    };

    private final CareerSaveLifecycleService saves;
    private final JdbcOperations jdbc;
    private final ObjectMapper json;
    private final ManagerService managers;

    public CareerRosterService(CareerSaveLifecycleService saves, JdbcOperations jdbc,
                               ObjectMapper json, ManagerService managers) {
        this.saves = saves;
        this.jdbc = jdbc;
        this.json = json;
        this.managers = managers;
    }

    public String clubName(UUID clubId) {
        return jdbc.queryForObject("SELECT name FROM clubs WHERE id = ?", String.class, clubId);
    }

    public List<PlayerSnapshot> squad(Long ownerUserId, UUID careerId, UUID clubId) {
        saves.get(ownerUserId, careerId);
        var belongs = jdbc.queryForObject(
            "SELECT count(*) FROM clubs WHERE id = ? AND career_save_id = ?", Integer.class, clubId, careerId);
        if (belongs == null || belongs == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Career resource not found");
        }
        return players(clubId);
    }

    TeamSnapshot team(UUID clubId, Lineup requestedLineup, Tactic requestedTactic) {
        var name = jdbc.queryForObject("SELECT name FROM clubs WHERE id = ?", String.class, clubId);
        var players = players(clubId);
        var lineup = requestedLineup == null
            ? (managers == null ? defaultLineup(players) : managers.lineup(clubId, players))
            : requestedLineup;
        var tactic = requestedTactic == null ? TacticPresets.get("BALANCED") : requestedTactic;
        return new TeamSnapshot(clubId, name, players, lineup, tactic, managers == null ? null : managers.plan(clubId));
    }

    Tactic aiTactic(UUID clubId, UUID opponentId, Tactic opponentTactic) {
        var club = jdbc.queryForMap("SELECT preferred_tactic, reputation FROM clubs WHERE id = ?", clubId);
        var opponentStrength = jdbc.queryForObject("SELECT reputation FROM clubs WHERE id = ?", Integer.class, opponentId);
        var condition = jdbc.queryForMap("""
            SELECT COALESCE(avg(fitness), 100) fitness, COALESCE(avg(form), 50) form,
                   count(*) FILTER (WHERE availability <> 'AVAILABLE') unavailable
            FROM players WHERE club_id = ?
            """, clubId);
        var difference = ((Number) club.get("reputation")).intValue() - opponentStrength;
        if (managers != null) {
            return managers.tactic(clubId, difference,
                ((Number) condition.get("fitness")).doubleValue(), ((Number) condition.get("form")).doubleValue(),
                ((Number) condition.get("unavailable")).longValue(), opponentTactic);
        }
        return TacticPresets.get(TacticPresets.choose((String) club.get("preferred_tactic"), difference,
            ((Number) condition.get("fitness")).doubleValue(), ((Number) condition.get("form")).doubleValue(),
            ((Number) condition.get("unavailable")).longValue(), opponentTactic));
    }

    private List<PlayerSnapshot> players(UUID clubId) {
        return jdbc.query("""
            SELECT id, name, primary_position, secondary_positions, attributes::text, age, availability, fitness, morale, form
            FROM players WHERE club_id = ? ORDER BY name
            """, (rs, row) -> new PlayerSnapshot(
            rs.getObject("id", UUID.class), rs.getString("name"), Position.valueOf(rs.getString("primary_position")),
            Arrays.stream((String[]) rs.getArray("secondary_positions").getArray()).map(Position::valueOf)
                .collect(java.util.stream.Collectors.toSet()),
            readAttributes(rs.getString("attributes")), rs.getInt("age"),
            PlayerAvailability.valueOf(rs.getString("availability")),
            rs.getDouble("fitness"), rs.getDouble("morale"), rs.getDouble("form")
        ), clubId);
    }

    // Kept for isolated unit construction where ManagerService is intentionally absent.
    Lineup defaultLineup(List<PlayerSnapshot> players) {
        var available = players.stream().filter(player -> player.availability() == PlayerAvailability.AVAILABLE).toList();
        var selected = new ArrayList<PlayerSnapshot>();
        var starters = new ArrayList<LineupSlot>();
        for (var position : FORMATION) {
            var player = available.stream()
                .filter(candidate -> !selected.contains(candidate))
                .filter(candidate -> candidate.primaryPosition() == position)
                .findFirst()
                .orElseGet(() -> available.stream().filter(candidate -> !selected.contains(candidate)).findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Not enough available players")));
            selected.add(player);
            starters.add(new LineupSlot(player.id(), position, role(position)));
        }
        var starterIds = selected.stream().map(PlayerSnapshot::id).collect(java.util.stream.Collectors.toSet());
        var bench = available.stream().map(PlayerSnapshot::id).filter(id -> !starterIds.contains(id)).limit(7).toList();
        return new Lineup(Formation.FOUR_THREE_THREE, starters, bench);
    }

    private static PlayerRole role(Position position) {
        return switch (position) {
            case GK -> PlayerRole.GOALKEEPER;
            case LB, RB -> PlayerRole.FULL_BACK;
            case CB -> PlayerRole.CENTRAL_DEFENDER;
            case CM, DM, AM -> PlayerRole.CENTRAL_MIDFIELDER;
            case LW, RW, LM, RM -> PlayerRole.WINGER;
            case ST -> PlayerRole.POACHER;
            default -> throw new IllegalArgumentException("Unsupported seeded position: " + position);
        };
    }

    private PlayerAttributes readAttributes(String value) {
        try {
            return json.readValue(value, PlayerAttributes.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored player attributes are invalid", exception);
        }
    }
}
