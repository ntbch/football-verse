package com.footballverse.game.career;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.dto.*;
import com.footballverse.game.persistence.CareerSaveRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class CareerTacticsService {
    private final JdbcOperations jdbc;
    private final CareerSaveRepository careers;
    private final ObjectMapper json;

    public CareerTacticsService(JdbcOperations jdbc, CareerSaveRepository careers, ObjectMapper json) {
        this.jdbc = jdbc; this.careers = careers; this.json = json;
    }

    public TacticalSetup get(long ownerId, UUID careerId) {
        career(ownerId, careerId);
        var value = jdbc.queryForObject("SELECT tactical_setup::text FROM career_saves WHERE id=?", String.class, careerId);
        if (value == null) return null;
        try { return json.readValue(value, TacticalSetup.class); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Stored tactical setup is invalid", exception); }
    }

    @Transactional
    public TacticalSetup save(long ownerId, UUID careerId, TacticalSetup setup) {
        var career = career(ownerId, careerId);
        validate(careerId, career.getManagedClubId(), setup);
        try { jdbc.update("UPDATE career_saves SET tactical_setup=CAST(? AS jsonb), updated_at=now() WHERE id=?", json.writeValueAsString(setup), careerId); }
        catch (JsonProcessingException exception) { throw new IllegalArgumentException("Tactical setup cannot be serialized", exception); }
        return setup;
    }

    public List<PlayerAnalysis> analysis(long ownerId, UUID careerId, UUID clubId) {
        var career = career(ownerId, careerId);
        if (!clubId.equals(career.getManagedClubId())) throw notFound();
        return jdbc.query("""
            SELECT id, primary_position, secondary_positions, attributes::text, fitness, form
            FROM players WHERE career_save_id=? AND club_id=? ORDER BY name
            """, (rs, row) -> {
            try {
                var attributes = json.readTree(rs.getString("attributes"));
                var values = new ArrayList<Integer>(); attributes.elements().forEachRemaining(value -> values.add(value.asInt()));
                var overall = values.stream().mapToInt(Integer::intValue).average().orElse(1);
                var score = (int) Math.round(overall * .7 + rs.getDouble("fitness") * .15 + rs.getDouble("form") * .15);
                var position = Position.valueOf(rs.getString("primary_position"));
                return new PlayerAnalysis(rs.getObject("id", UUID.class), group(position), Math.min(100, score),
                    rs.getDouble("fitness") < 75 ? "Fitness lowers rank" : rs.getDouble("form") < 45 ? "Form lowers rank" : "Natural position");
            } catch (JsonProcessingException exception) { throw new IllegalStateException(exception); }
        }, careerId, clubId);
    }

    private void validate(UUID careerId, UUID clubId, TacticalSetup setup) {
        if (clubId == null || setup == null || setup.lineup() == null || setup.tactic() == null) throw bad("Complete tactical setup is required");
        var lineup = setup.lineup();
        if (lineup.starters() == null || lineup.starters().size() != 11) throw bad("Lineup must contain 11 starters");
        var starters = lineup.starters().stream().map(LineupSlot::playerId).toList();
        var selected = new HashSet<>(starters);
        if (selected.size() != 11 || lineup.bench() == null || new HashSet<>(lineup.bench()).size() != lineup.bench().size()
            || lineup.bench().stream().anyMatch(selected::contains)) throw bad("Selected players must be unique");
        var actualPositions = lineup.starters().stream().map(LineupSlot::position).sorted().toList();
        if (!actualPositions.equals(expectedPositions(lineup.formation()).stream().sorted().toList())) throw bad("Starter positions do not match formation");
        for (var slot : lineup.starters()) {
            if (slot.role() == null || slot.duty() == null || !validPositions(slot.role()).contains(slot.position()) || !validDuties(slot.role()).contains(slot.duty()))
                throw bad("Role or duty is not valid for tactical position");
        }
        selected.addAll(lineup.bench());
        // ponytail: at most 20 selected players, simple ownership checks are clearer than dynamic SQL.
        for (var playerId : selected) {
            var count = jdbc.queryForObject("SELECT count(*) FROM players WHERE id=? AND career_save_id=? AND club_id=? AND availability='AVAILABLE'", Integer.class, playerId, careerId, clubId);
            if (count == null || count == 0) throw bad("Selected player is unavailable or does not belong to the managed club");
        }
    }

    private com.footballverse.game.persistence.CareerSaveEntity career(long owner, UUID id) {
        return careers.findByIdAndOwnerUserId(id, owner).orElseThrow(this::notFound);
    }
    private static String group(Position position) { return switch (position) {
        case GK -> "GOALKEEPERS"; case CB -> "CENTRE_BACKS"; case LB, RB, LWB, RWB -> "FULL_BACKS";
        case DM -> "DEFENSIVE_MIDFIELD"; case CM, AM -> "CENTRAL_MIDFIELD"; case LM, RM, LW, RW -> "WIDE_PLAYERS"; case ST -> "STRIKERS";
    }; }
    private static List<Position> expectedPositions(Formation formation) { return switch (formation) {
        case FOUR_THREE_THREE -> List.of(Position.GK,Position.LB,Position.CB,Position.CB,Position.RB,Position.CM,Position.CM,Position.CM,Position.LW,Position.RW,Position.ST);
        case FOUR_FOUR_TWO -> List.of(Position.GK,Position.LB,Position.CB,Position.CB,Position.RB,Position.LM,Position.CM,Position.CM,Position.RM,Position.ST,Position.ST);
        case THREE_FIVE_TWO -> List.of(Position.GK,Position.CB,Position.CB,Position.CB,Position.LWB,Position.CM,Position.CM,Position.CM,Position.RWB,Position.ST,Position.ST);
        case FOUR_TWO_THREE_ONE -> List.of(Position.GK,Position.LB,Position.CB,Position.CB,Position.RB,Position.DM,Position.DM,Position.LW,Position.AM,Position.RW,Position.ST);
        case FOUR_ONE_FOUR_ONE -> List.of(Position.GK,Position.LB,Position.CB,Position.CB,Position.RB,Position.DM,Position.LM,Position.CM,Position.CM,Position.RM,Position.ST);
        case FOUR_THREE_TWO_ONE -> List.of(Position.GK,Position.LB,Position.CB,Position.CB,Position.RB,Position.CM,Position.CM,Position.CM,Position.AM,Position.AM,Position.ST);
        case FOUR_TWO_TWO_TWO -> List.of(Position.GK,Position.LB,Position.CB,Position.CB,Position.RB,Position.DM,Position.DM,Position.AM,Position.AM,Position.ST,Position.ST);
        case FOUR_FOUR_ONE_ONE -> List.of(Position.GK,Position.LB,Position.CB,Position.CB,Position.RB,Position.LM,Position.CM,Position.CM,Position.RM,Position.AM,Position.ST);
        case FOUR_FIVE_ONE -> List.of(Position.GK,Position.LB,Position.CB,Position.CB,Position.RB,Position.LM,Position.CM,Position.CM,Position.CM,Position.RM,Position.ST);
        case FOUR_TWO_FOUR -> List.of(Position.GK,Position.LB,Position.CB,Position.CB,Position.RB,Position.CM,Position.CM,Position.LW,Position.RW,Position.ST,Position.ST);
        case THREE_FOUR_THREE -> List.of(Position.GK,Position.CB,Position.CB,Position.CB,Position.LM,Position.CM,Position.CM,Position.RM,Position.LW,Position.ST,Position.RW);
        case THREE_FOUR_TWO_ONE -> List.of(Position.GK,Position.CB,Position.CB,Position.CB,Position.LM,Position.CM,Position.CM,Position.RM,Position.AM,Position.AM,Position.ST);
        case THREE_ONE_FOUR_TWO -> List.of(Position.GK,Position.CB,Position.CB,Position.CB,Position.DM,Position.LM,Position.CM,Position.CM,Position.RM,Position.ST,Position.ST);
        case FIVE_THREE_TWO -> List.of(Position.GK,Position.LWB,Position.CB,Position.CB,Position.CB,Position.RWB,Position.CM,Position.CM,Position.CM,Position.ST,Position.ST);
        case FIVE_TWO_THREE -> List.of(Position.GK,Position.LWB,Position.CB,Position.CB,Position.CB,Position.RWB,Position.CM,Position.CM,Position.LW,Position.ST,Position.RW);
    }; }
    private static Set<Position> validPositions(PlayerRole role) { return switch (role) {
        case GOALKEEPER, SWEEPER_KEEPER -> Set.of(Position.GK); case FULL_BACK -> Set.of(Position.LB,Position.RB);
        case WING_BACK -> Set.of(Position.LB,Position.RB,Position.LWB,Position.RWB);
        case CENTRAL_DEFENDER, STOPPER, COVER, BALL_PLAYING_DEFENDER -> Set.of(Position.CB); case ANCHOR -> Set.of(Position.DM);
        case BALL_WINNER, DEEP_LYING_PLAYMAKER -> Set.of(Position.DM,Position.CM); case CENTRAL_MIDFIELDER, BOX_TO_BOX -> Set.of(Position.CM);
        case ADVANCED_PLAYMAKER -> Set.of(Position.CM,Position.AM); case ATTACKING_MIDFIELDER -> Set.of(Position.AM);
        case WINGER -> Set.of(Position.LM,Position.RM,Position.LW,Position.RW); case INSIDE_FORWARD -> Set.of(Position.LW,Position.RW);
        case POACHER, TARGET_FORWARD, PRESSING_FORWARD, COMPLETE_FORWARD -> Set.of(Position.ST);
    }; }
    private static Set<Duty> validDuties(PlayerRole role) { return switch (role) {
        case GOALKEEPER, ANCHOR -> Set.of(Duty.DEFEND); case POACHER -> Set.of(Duty.ATTACK);
        case TARGET_FORWARD -> Set.of(Duty.SUPPORT,Duty.ATTACK); default -> Set.of(Duty.DEFEND,Duty.SUPPORT,Duty.ATTACK);
    }; }
    private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Career tactics not found"); }

    public record TacticalSetup(Lineup lineup, Tactic tactic) {}
    public record PlayerAnalysis(UUID playerId, String group, int score, String reason) {}
}
