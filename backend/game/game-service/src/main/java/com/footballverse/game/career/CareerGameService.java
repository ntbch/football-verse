package com.footballverse.game.career;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.dto.*;
import com.footballverse.game.engine.MatchEngineClient;
import com.footballverse.game.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;

@Service
public class CareerGameService {
    private static final Position[] FORMATION = {
        Position.GK, Position.LB, Position.CB, Position.CB, Position.RB,
        Position.CM, Position.CM, Position.CM, Position.LW, Position.RW, Position.ST
    };
    private static final Position[] SQUAD_POSITIONS = {
        Position.GK, Position.GK,
        Position.LB, Position.CB, Position.CB, Position.CB, Position.RB,
        Position.CM, Position.CM, Position.CM, Position.DM, Position.AM,
        Position.LW, Position.RW, Position.LM, Position.RM,
        Position.ST, Position.ST
    };
    private static final String ENGINE_VERSION = "0.1.0";
    private static final String RULESET_VERSION = "1";

    private final CareerSaveRepository careers;
    private final FixtureRepository fixtures;
    private final SimulatedMatchRepository matches;
    private final CareerMatchPersistenceService persistence;
    private final MatchEngineClient engine;
    private final JdbcOperations jdbc;
    private final ObjectMapper json;

    public CareerGameService(CareerSaveRepository careers, FixtureRepository fixtures,
                             SimulatedMatchRepository matches, CareerMatchPersistenceService persistence,
                             MatchEngineClient engine, JdbcOperations jdbc, ObjectMapper json) {
        this.careers = careers;
        this.fixtures = fixtures;
        this.matches = matches;
        this.persistence = persistence;
        this.engine = engine;
        this.jdbc = jdbc;
        this.json = json;
    }

    @Transactional
    public CareerSaveEntity create(Long ownerUserId, String name) {
        var career = careers.saveAndFlush(new CareerSaveEntity(ownerUserId, name, LocalDate.now()));
        var clubs = List.of(
            seedClub(career.getId(), "Aurora FC", 64),
            seedClub(career.getId(), "Riverside United", 61),
            seedClub(career.getId(), "Northbridge City", 62),
            seedClub(career.getId(), "Harbor Athletic", 60)
        );
        seedFixtures(career.getId(), career.getSeasonNumber(), career.getGameDate().plusDays(1), clubs);
        return career;
    }

    public List<CareerSaveEntity> list(Long ownerUserId) {
        return careers.findAllByOwnerUserIdOrderByCreatedAtDesc(ownerUserId);
    }

    public CareerSaveEntity get(Long ownerUserId, UUID careerId) {
        return careers.findByIdAndOwnerUserId(careerId, ownerUserId).orElseThrow(this::notFound);
    }

    public List<FixtureEntity> fixtures(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        return fixtures.findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(careerId, career.getSeasonNumber());
    }

    @Transactional
    public CareerSaveEntity advanceDay(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        if (!"ACTIVE".equals(career.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Career season is finished");
        }
        career.advanceDay();
        jdbc.update("UPDATE players SET fitness = LEAST(100, fitness + 12) WHERE career_save_id = ?", careerId);
        jdbc.update("""
            UPDATE players
            SET availability = 'AVAILABLE', unavailable_until = NULL
            WHERE career_save_id = ? AND unavailable_until <= ?
            """, careerId, career.getGameDate());
        return careers.save(career);
    }

    public List<ClubStanding> standings(Long ownerUserId, UUID careerId) {
        return standings(get(ownerUserId, careerId));
    }

    public SeasonSummary seasonSummary(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        return currentSeasonSummary(career);
    }

    public List<SeasonRecord> history(Long ownerUserId, UUID careerId) {
        get(ownerUserId, careerId);
        return seasonRecords(careerId);
    }

    @Transactional
    public CareerSaveEntity nextSeason(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        if (!"SEASON_FINISHED".equals(career.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Finish the current season first");
        }
        var firstDate = career.getGameDate().plusDays(1);
        career.startNextSeason(firstDate);
        seedFixtures(careerId, career.getSeasonNumber(), firstDate, clubIds(careerId));
        return careers.save(career);
    }

    private List<ClubStanding> standings(CareerSaveEntity career) {
        var table = new LinkedHashMap<UUID, StandingAccumulator>();
        jdbc.query("SELECT id, name FROM clubs WHERE career_save_id = ? ORDER BY name", (rs, row) -> {
            table.put(rs.getObject("id", UUID.class), new StandingAccumulator(rs.getObject("id", UUID.class), rs.getString("name")));
            return 0;
        }, career.getId());
        var results = jdbc.query("""
            SELECT f.home_club_id, f.away_club_id, m.home_score, m.away_score
            FROM matches m JOIN fixtures f ON f.id = m.fixture_id
            WHERE m.career_save_id = ? AND f.season_number = ? AND m.status = 'COMPLETED'
            """, (rs, row) -> new PlayedScore(
            rs.getObject("home_club_id", UUID.class), rs.getObject("away_club_id", UUID.class),
            rs.getInt("home_score"), rs.getInt("away_score")
        ), career.getId(), career.getSeasonNumber());
        for (var result : results) {
            table.get(result.homeId()).add(result.homeScore(), result.awayScore());
            table.get(result.awayId()).add(result.awayScore(), result.homeScore());
        }
        return table.values().stream().sorted(Comparator
            .comparingInt(StandingAccumulator::points).reversed()
            .thenComparing(Comparator.comparingInt(StandingAccumulator::difference).reversed())
            .thenComparing(Comparator.comparingInt(StandingAccumulator::goalsFor).reversed())
            .thenComparing(StandingAccumulator::name))
            .map(StandingAccumulator::view).toList();
    }

    public PlayedMatch play(Long ownerUserId, UUID careerId, UUID fixtureId, long seed,
                            Lineup homeLineup, Tactic homeTactic) {
        var career = get(ownerUserId, careerId);
        if (!"ACTIVE".equals(career.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Career season is finished");
        }
        var existing = matches.findByFixtureIdAndOwnerUserId(fixtureId, ownerUserId);
        if (existing.isPresent()) {
            return played(existing.get());
        }
        var fixture = fixtures.findByIdAndCareerSaveId(fixtureId, careerId).orElseThrow(this::notFound);
        if (fixture.getMatchDate().isAfter(career.getGameDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Advance the Career date to play this fixture");
        }
        if (!"SCHEDULED".equals(fixture.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Fixture is not scheduled");
        }
        var input = new MatchInput(seed, ENGINE_VERSION, RULESET_VERSION,
            team(fixture.getHomeClubId(), homeLineup, homeTactic), team(fixture.getAwayClubId(), null, null));
        var result = engine.simulate(input);
        var stored = persistence.store(ownerUserId, careerId, fixtureId, "fixture-" + fixtureId,
            input, result);
        applyAvailabilityEvents(career, result);
        finishSeasonIfComplete(career);
        return played(stored);
    }

    public String clubName(UUID clubId) {
        return jdbc.queryForObject("SELECT name FROM clubs WHERE id = ?", String.class, clubId);
    }

    public List<PlayerSnapshot> squad(Long ownerUserId, UUID careerId, UUID clubId) {
        get(ownerUserId, careerId);
        var belongs = jdbc.queryForObject(
            "SELECT count(*) FROM clubs WHERE id = ? AND career_save_id = ?", Integer.class, clubId, careerId);
        if (belongs == null || belongs == 0) {
            throw notFound();
        }
        return players(clubId);
    }

    public JsonNode match(Long ownerUserId, UUID careerId, UUID matchId) {
        get(ownerUserId, careerId);
        return result(matches.findByIdAndCareerSaveIdAndOwnerUserId(matchId, careerId, ownerUserId)
            .orElseThrow(this::notFound));
    }

    public JsonNode events(Long ownerUserId, UUID careerId, UUID matchId) {
        return match(ownerUserId, careerId, matchId).path("events");
    }

    private UUID seedClub(UUID careerId, String name, int rating) {
        var clubId = UUID.randomUUID();
        jdbc.update("INSERT INTO clubs (id, career_save_id, name, reputation) VALUES (?, ?, ?, ?)",
            clubId, careerId, name, rating);
        for (int index = 0; index < SQUAD_POSITIONS.length; index++) {
            var position = SQUAD_POSITIONS[index];
            var attributes = attributesFor(position, rating + ((index % 5) - 2));
            jdbc.update("""
                INSERT INTO players (id, career_save_id, club_id, name, primary_position, attributes)
                VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
                """, UUID.randomUUID(), careerId, clubId, name + " Player " + (index + 1),
                position.name(), write(attributes));
        }
        return clubId;
    }

    private void seedFixtures(UUID careerId, int seasonNumber, LocalDate startDate, List<UUID> clubs) {
        var date = startDate;
        for (int home = 0; home < clubs.size(); home++) {
            for (int away = home + 1; away < clubs.size(); away++) {
                fixtures.save(new FixtureEntity(careerId, clubs.get(home), clubs.get(away), date, seasonNumber));
                date = date.plusDays(1);
            }
        }
    }

    private List<UUID> clubIds(UUID careerId) {
        return jdbc.query("SELECT id FROM clubs WHERE career_save_id = ? ORDER BY name",
            (rs, row) -> rs.getObject("id", UUID.class), careerId);
    }

    private void finishSeasonIfComplete(CareerSaveEntity career) {
        var remaining = jdbc.queryForObject("""
            SELECT count(*) FROM fixtures
            WHERE career_save_id = ? AND season_number = ? AND status <> 'PLAYED'
            """, Integer.class, career.getId(), career.getSeasonNumber());
        if (remaining != null && remaining == 0) {
            recordSeason(career, standings(career));
            career.finishSeason();
            careers.save(career);
        }
    }

    private SeasonSummary currentSeasonSummary(CareerSaveEntity career) {
        return seasonRecords(career.getId()).stream()
            .filter(record -> record.seasonNumber() == career.getSeasonNumber())
            .map(record -> new SeasonSummary(record.seasonNumber(), record.championClubId(),
                record.championClubName(), record.finalTable()))
            .findFirst()
            .orElse(null);
    }

    private void recordSeason(CareerSaveEntity career, List<ClubStanding> table) {
        if (table.isEmpty() || currentSeasonSummary(career) != null) {
            return;
        }
        var champion = table.get(0);
        jdbc.update("""
            INSERT INTO season_records
                (id, career_save_id, season_number, champion_club_id, champion_club_name, final_table)
            VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
            ON CONFLICT (career_save_id, season_number) DO NOTHING
            """, UUID.randomUUID(), career.getId(), career.getSeasonNumber(),
            champion.clubId(), champion.clubName(), write(table));
    }

    private List<SeasonRecord> seasonRecords(UUID careerId) {
        return jdbc.query("""
            SELECT season_number, champion_club_id, champion_club_name, final_table::text
            FROM season_records
            WHERE career_save_id = ?
            ORDER BY season_number DESC
            """, (rs, row) -> new SeasonRecord(
            rs.getInt("season_number"),
            rs.getObject("champion_club_id", UUID.class),
            rs.getString("champion_club_name"),
            readTable(rs.getString("final_table"))
        ), careerId);
    }

    private TeamSnapshot team(UUID clubId, Lineup requestedLineup, Tactic requestedTactic) {
        var name = jdbc.queryForObject("SELECT name FROM clubs WHERE id = ?", String.class, clubId);
        var players = players(clubId);
        var lineup = requestedLineup == null ? defaultLineup(players) : requestedLineup;
        var tactic = requestedTactic == null ? defaultTactic() : requestedTactic;
        return new TeamSnapshot(clubId, name, players, lineup, tactic);
    }

    private List<PlayerSnapshot> players(UUID clubId) {
        return jdbc.query("""
            SELECT id, name, primary_position, attributes::text, availability, fitness, morale, form
            FROM players WHERE club_id = ? ORDER BY name
            """, (rs, row) -> new PlayerSnapshot(
            rs.getObject("id", UUID.class), rs.getString("name"), Position.valueOf(rs.getString("primary_position")),
            Set.of(), readAttributes(rs.getString("attributes")), PlayerAvailability.valueOf(rs.getString("availability")),
            rs.getDouble("fitness"), rs.getDouble("morale"), rs.getDouble("form")
        ), clubId);
    }

    private Lineup defaultLineup(List<PlayerSnapshot> players) {
        var available = players.stream().filter(player -> player.availability() == PlayerAvailability.AVAILABLE).toList();
        var selected = new ArrayList<PlayerSnapshot>();
        var starters = new ArrayList<LineupSlot>();
        for (var position : FORMATION) {
            var player = pickForPosition(available, selected, position);
            selected.add(player);
            starters.add(new LineupSlot(player.id(), position, role(position)));
        }
        var starterIds = selected.stream().map(PlayerSnapshot::id).collect(java.util.stream.Collectors.toSet());
        var bench = available.stream().map(PlayerSnapshot::id).filter(id -> !starterIds.contains(id)).limit(7).toList();
        return new Lineup(Formation.FOUR_THREE_THREE, starters, bench);
    }

    private PlayerSnapshot pickForPosition(List<PlayerSnapshot> players, List<PlayerSnapshot> selected, Position position) {
        return players.stream()
            .filter(player -> !selected.contains(player))
            .filter(player -> player.primaryPosition() == position)
            .findFirst()
            .orElseGet(() -> players.stream().filter(player -> !selected.contains(player)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Not enough available players")));
    }

    private Tactic defaultTactic() {
        return new Tactic(Mentality.BALANCED, Tempo.NORMAL, Width.NORMAL, PassingStyle.MIXED,
            Pressing.STANDARD, DefensiveLine.STANDARD, Transition.BALANCED, TimeWasting.OFF);
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

    private PlayerAttributes attributesFor(Position position, int rating) {
        var r = Math.max(1, Math.min(100, rating));
        return switch (position) {
            case GK -> new PlayerAttributes(r - 8, r - 8, r - 8, r - 6, r - 15, r, r, r, r + 2, r, r,
                r, r - 8, r, r + 10, r + 10, r + 10, r + 8);
            case CB, LB, RB, LWB, RWB -> new PlayerAttributes(r, r, r - 2, r + 8, r - 8, r, r + 5, r + 5,
                r + 5, r, r + 8, r, r + 4, r, r - 20, r - 20, r - 20, r - 10);
            case DM, CM, AM, LM, RM -> new PlayerAttributes(r + 6, r + 5, r + 4, r, r, r, r, r + 4, r - 2,
                r + 6, r + 4, r + 4, r, r + 5, r - 20, r - 20, r - 20, r - 10);
            default -> new PlayerAttributes(r, r + 4, r + 5, r - 6, r + 8, r + 4, r, r, r,
                r, r, r + 6, r, r, r - 20, r - 20, r - 20, r - 10);
        };
    }

    private void applyAvailabilityEvents(CareerSaveEntity career, MatchResult result) {
        for (var event : result.events()) {
            if (event.playerId() == null || event.type() == EventType.SUBSTITUTION) {
                continue;
            }
            if (event.type() == EventType.INJURY) {
                var days = ((Number) event.payload().getOrDefault("days", 3)).intValue();
                setUnavailable(career, event.playerId(), PlayerAvailability.INJURED, days);
            } else if (event.type() == EventType.RED_CARD) {
                setUnavailable(career, event.playerId(), PlayerAvailability.SUSPENDED, 1);
            }
        }
    }

    private void setUnavailable(CareerSaveEntity career, UUID playerId, PlayerAvailability availability, int days) {
        jdbc.update("""
            UPDATE players
            SET availability = ?, unavailable_until = ?
            WHERE id = ? AND career_save_id = ?
            """, availability.name(), career.getGameDate().plusDays(days), playerId, career.getId());
    }

    private JsonNode result(SimulatedMatchEntity match) {
        if (match.getResultSnapshot() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Match is not completed");
        }
        try {
            return json.readTree(match.getResultSnapshot());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored match result is invalid", exception);
        }
    }

    private PlayedMatch played(SimulatedMatchEntity match) {
        return new PlayedMatch(match.getId(), result(match));
    }

    private PlayerAttributes readAttributes(String value) {
        try {
            return json.readValue(value, PlayerAttributes.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored player attributes are invalid", exception);
        }
    }

    private List<ClubStanding> readTable(String value) {
        try {
            return json.readValue(value, json.getTypeFactory().constructCollectionType(List.class, ClubStanding.class));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored season table is invalid", exception);
        }
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Career seed cannot be serialized", exception);
        }
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Career resource not found");
    }

    public record PlayedMatch(UUID matchId, JsonNode result) {}
    public record ClubStanding(UUID clubId, String clubName, int played, int wins, int draws, int losses,
                               int goalsFor, int goalsAgainst, int goalDifference, int points) {}
    public record SeasonSummary(int seasonNumber, UUID championClubId, String championClubName,
                                List<ClubStanding> finalTable) {}
    public record SeasonRecord(int seasonNumber, UUID championClubId, String championClubName,
                               List<ClubStanding> finalTable) {}

    private record PlayedScore(UUID homeId, UUID awayId, int homeScore, int awayScore) {}

    private static final class StandingAccumulator {
        private final UUID id;
        private final String name;
        private int played;
        private int wins;
        private int draws;
        private int losses;
        private int goalsFor;
        private int goalsAgainst;

        private StandingAccumulator(UUID id, String name) { this.id = id; this.name = name; }
        private void add(int scored, int conceded) {
            played++; goalsFor += scored; goalsAgainst += conceded;
            if (scored > conceded) wins++; else if (scored < conceded) losses++; else draws++;
        }
        private int points() { return wins * 3 + draws; }
        private int difference() { return goalsFor - goalsAgainst; }
        private int goalsFor() { return goalsFor; }
        private String name() { return name; }
        private ClubStanding view() { return new ClubStanding(id, name, played, wins, draws, losses, goalsFor, goalsAgainst, difference(), points()); }
    }
}
