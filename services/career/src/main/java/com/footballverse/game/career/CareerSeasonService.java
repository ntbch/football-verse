package com.footballverse.game.career;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.dto.PlayerAttributes;
import com.footballverse.game.persistence.CareerSaveEntity;
import com.footballverse.game.persistence.CareerSaveRepository;
import com.footballverse.game.persistence.FixtureEntity;
import com.footballverse.game.persistence.FixtureRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class CareerSeasonService {
    private final CareerSaveLifecycleService saves;
    private final CareerSaveRepository careers;
    private final FixtureRepository fixtures;
    private final JdbcOperations jdbc;
    private final ObjectMapper json;

    public CareerSeasonService(CareerSaveLifecycleService saves, CareerSaveRepository careers,
                               FixtureRepository fixtures, JdbcOperations jdbc, ObjectMapper json) {
        this.saves = saves;
        this.careers = careers;
        this.fixtures = fixtures;
        this.jdbc = jdbc;
        this.json = json;
    }

    @Transactional
    public CareerSaveEntity advanceDay(Long ownerUserId, UUID careerId) {
        var career = saves.get(ownerUserId, careerId);
        if (!java.util.Set.of("ACTIVE", "UNEMPLOYED").contains(career.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Career season is finished");
        }
        var due = fixtures.findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(careerId, career.getSeasonNumber()).stream()
            .anyMatch(fixture -> "SCHEDULED".equals(fixture.getStatus()) && !fixture.getMatchDate().isAfter(career.getGameDate()));
        if (due) throw new ResponseStatusException(HttpStatus.CONFLICT,
            career.getManagedClubId() == null ? "Complete the matchday before advancing" : "Play your fixture before advancing");
        career.advanceDay();
        jdbc.update("UPDATE players SET fitness = LEAST(100, fitness + 12) WHERE career_save_id = ?", careerId);
        applyTraining(career);
        jdbc.update("""
            UPDATE players
            SET availability = 'AVAILABLE', unavailable_until = NULL
            WHERE career_save_id = ? AND unavailable_until <= ?
            """, careerId, career.getGameDate());
        return careers.save(career);
    }

    @Transactional
    public CareerSaveEntity nextSeason(Long ownerUserId, UUID careerId) {
        var career = saves.get(ownerUserId, careerId);
        if (!"SEASON_FINISHED".equals(career.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Finish the current season first");
        }
        var firstDate = career.getGameDate().plusDays(1);
        career.startNextSeason(firstDate);
        for (var pairing : CareerGameService.schedule(clubIds(careerId))) {
            fixtures.save(new FixtureEntity(careerId, pairing.home(), pairing.away(),
                firstDate.plusWeeks(pairing.matchday() - 1L), career.getSeasonNumber(), pairing.matchday()));
        }
        return careers.save(career);
    }

    public List<CareerGameService.ClubStanding> standings(Long ownerUserId, UUID careerId) {
        return standings(saves.get(ownerUserId, careerId));
    }

    List<CareerGameService.ClubStanding> standings(CareerSaveEntity career) {
        var table = new LinkedHashMap<UUID, StandingAccumulator>();
        jdbc.query("SELECT id, name FROM clubs WHERE career_save_id = ? ORDER BY name", (rs, row) -> {
            var id = rs.getObject("id", UUID.class);
            table.put(id, new StandingAccumulator(id, rs.getString("name")));
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

    public CareerGameService.SeasonSummary summary(Long ownerUserId, UUID careerId) {
        return currentSummary(saves.get(ownerUserId, careerId));
    }

    public List<CareerGameService.SeasonRecord> history(Long ownerUserId, UUID careerId) {
        saves.get(ownerUserId, careerId);
        return records(careerId);
    }

    public List<CareerGameService.PlayerSeasonStats> playerStats(Long ownerUserId, UUID careerId) {
        var career = saves.get(ownerUserId, careerId);
        return jdbc.query("""
            SELECT p.id, p.name, c.id AS club_id, c.name AS club_name,
                   (count(mps.id) FILTER (WHERE f.season_number = ?))::int AS appearances,
                   COALESCE(sum((mps.stats->>'minutes')::int) FILTER (WHERE f.season_number = ?), 0)::int AS minutes,
                   COALESCE(sum((mps.stats->>'goals')::int) FILTER (WHERE f.season_number = ?), 0)::int AS goals,
                   COALESCE(sum((mps.stats->>'assists')::int) FILTER (WHERE f.season_number = ?), 0)::int AS assists,
                   COALESCE(avg((mps.stats->>'rating')::numeric) FILTER (WHERE f.season_number = ?), 0)::double precision AS avg_rating
            FROM players p
            JOIN clubs c ON c.id = p.club_id
            LEFT JOIN match_player_stats mps ON mps.player_id = p.id
            LEFT JOIN matches m ON m.id = mps.match_id
            LEFT JOIN fixtures f ON f.id = m.fixture_id
            WHERE p.career_save_id = ?
            GROUP BY p.id, p.name, c.id, c.name
            ORDER BY goals DESC, avg_rating DESC, minutes DESC, p.name
            """, (rs, row) -> stats(rs), career.getSeasonNumber(), career.getSeasonNumber(),
            career.getSeasonNumber(), career.getSeasonNumber(), career.getSeasonNumber(), careerId);
    }

    public PageResult<CareerGameService.PlayerSeasonStats> playerStatsPage(
        Long ownerUserId, UUID careerId, int page, int size, String query
    ) {
        var career = saves.get(ownerUserId, careerId);
        page = Math.max(0, page);
        size = Math.max(1, Math.min(100, size));
        var normalized = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        var search = "%" + (normalized.length() < 2 ? "" : normalized) + "%";
        var total = jdbc.queryForObject("""
            SELECT count(*) FROM players p JOIN clubs c ON c.id=p.club_id
            WHERE p.career_save_id=? AND (lower(p.name) LIKE ? OR lower(c.name) LIKE ?)
            """, Long.class, careerId, search, search);
        var items = jdbc.query("""
            SELECT p.id, p.name, c.id AS club_id, c.name AS club_name,
                   (count(mps.id) FILTER (WHERE f.season_number = ?))::int AS appearances,
                   COALESCE(sum((mps.stats->>'minutes')::int) FILTER (WHERE f.season_number = ?), 0)::int AS minutes,
                   COALESCE(sum((mps.stats->>'goals')::int) FILTER (WHERE f.season_number = ?), 0)::int AS goals,
                   COALESCE(sum((mps.stats->>'assists')::int) FILTER (WHERE f.season_number = ?), 0)::int AS assists,
                   COALESCE(avg((mps.stats->>'rating')::numeric) FILTER (WHERE f.season_number = ?), 0)::double precision AS avg_rating
            FROM players p JOIN clubs c ON c.id=p.club_id
            LEFT JOIN match_player_stats mps ON mps.player_id=p.id
            LEFT JOIN matches m ON m.id=mps.match_id LEFT JOIN fixtures f ON f.id=m.fixture_id
            WHERE p.career_save_id=? AND (lower(p.name) LIKE ? OR lower(c.name) LIKE ?)
            GROUP BY p.id, p.name, c.id, c.name
            ORDER BY goals DESC, avg_rating DESC, minutes DESC, p.name, p.id
            LIMIT ? OFFSET ?
            """, (rs, row) -> stats(rs), career.getSeasonNumber(), career.getSeasonNumber(),
            career.getSeasonNumber(), career.getSeasonNumber(), career.getSeasonNumber(),
            careerId, search, search, size, page * size);
        return PageResult.of(items, page, size, total == null ? 0 : total, career.getVersion());
    }

    @Transactional
    public void finishIfComplete(CareerSaveEntity career) {
        var remaining = jdbc.queryForObject("""
            SELECT count(*) FROM fixtures
            WHERE career_save_id = ? AND season_number = ? AND status <> 'PLAYED'
            """, Integer.class, career.getId(), career.getSeasonNumber());
        if (remaining == null || remaining != 0 || currentSummary(career) != null) return;
        var table = standings(career);
        record(career, table);
        applyRewards(career, table);
        applyPlayerDevelopment(career);
        career.finishSeason();
        careers.save(career);
    }

    private CareerGameService.PlayerSeasonStats stats(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new CareerGameService.PlayerSeasonStats(
            rs.getObject("id", UUID.class), rs.getString("name"),
            rs.getObject("club_id", UUID.class), rs.getString("club_name"),
            rs.getInt("appearances"), rs.getInt("minutes"), rs.getInt("goals"),
            rs.getInt("assists"), Math.round(rs.getDouble("avg_rating") * 100.0) / 100.0
        );
    }

    private CareerGameService.SeasonSummary currentSummary(CareerSaveEntity career) {
        return records(career.getId()).stream()
            .filter(record -> record.seasonNumber() == career.getSeasonNumber())
            .map(record -> new CareerGameService.SeasonSummary(record.seasonNumber(), record.championClubId(),
                record.championClubName(), record.finalTable()))
            .findFirst().orElse(null);
    }

    private void record(CareerSaveEntity career, List<CareerGameService.ClubStanding> table) {
        if (table.isEmpty() || currentSummary(career) != null) return;
        var champion = table.getFirst();
        jdbc.update("""
            INSERT INTO season_records
                (id, career_save_id, season_number, champion_club_id, champion_club_name, final_table)
            VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
            ON CONFLICT (career_save_id, season_number) DO NOTHING
            """, UUID.randomUUID(), career.getId(), career.getSeasonNumber(),
            champion.clubId(), champion.clubName(), write(table));
    }

    private List<CareerGameService.SeasonRecord> records(UUID careerId) {
        return jdbc.query("""
            SELECT season_number, champion_club_id, champion_club_name, final_table::text
            FROM season_records WHERE career_save_id = ? ORDER BY season_number DESC
            """, (rs, row) -> new CareerGameService.SeasonRecord(
            rs.getInt("season_number"), rs.getObject("champion_club_id", UUID.class),
            rs.getString("champion_club_name"), readTable(rs.getString("final_table"))
        ), careerId);
    }

    private List<UUID> clubIds(UUID careerId) {
        return jdbc.query("SELECT id FROM clubs WHERE career_save_id = ? ORDER BY name",
            (rs, row) -> rs.getObject("id", UUID.class), careerId);
    }

    private void applyTraining(CareerSaveEntity career) {
        switch (career.getTrainingFocus()) {
            case "FITNESS" -> jdbc.update("UPDATE players SET fitness = LEAST(100, fitness + 5) WHERE career_save_id = ?", career.getId());
            case "MORALE" -> jdbc.update("UPDATE players SET morale = LEAST(100, morale + 3) WHERE career_save_id = ?", career.getId());
            case "ATTACK", "DEFENSE" -> jdbc.update("UPDATE players SET form = LEAST(100, form + 1) WHERE career_save_id = ?", career.getId());
            default -> { }
        }
    }

    private void applyRewards(CareerSaveEntity career, List<CareerGameService.ClubStanding> table) {
        for (int index = 0; index < table.size(); index++) {
            var standing = table.get(index);
            var reward = BigDecimal.valueOf(1_000_000L + standing.points() * 100_000L
                + (long) (table.size() - index) * 250_000L);
            jdbc.update("UPDATE clubs SET balance = balance + ? WHERE id = ? AND career_save_id = ?",
                reward, standing.clubId(), career.getId());
        }
    }

    private void applyPlayerDevelopment(CareerSaveEntity career) {
        jdbc.query("""
            SELECT p.id, p.attributes::text, p.form, p.age,
                   COALESCE(sum((mps.stats->>'minutes')::int) FILTER (WHERE f.season_number = ?), 0)::int AS minutes
            FROM players p
            LEFT JOIN match_player_stats mps ON mps.player_id = p.id
            LEFT JOIN matches m ON m.id = mps.match_id
            LEFT JOIN fixtures f ON f.id = m.fixture_id
            WHERE p.career_save_id = ?
            GROUP BY p.id, p.attributes, p.form, p.age
            """, rs -> {
            var delta = (rs.getInt("minutes") >= 180 || rs.getDouble("form") >= 65) ? 1 : rs.getDouble("form") < 40 ? -1 : 0;
            if (rs.getInt("age") >= 32) delta--;
            jdbc.update("""
                UPDATE players SET attributes = CAST(? AS jsonb), age = age + 1, form = 50
                WHERE id = ? AND career_save_id = ?
                """, write(adjust(readAttributes(rs.getString("attributes")), delta)),
                rs.getObject("id", UUID.class), career.getId());
        }, career.getSeasonNumber(), career.getId());
    }

    private PlayerAttributes adjust(PlayerAttributes a, int delta) {
        return new PlayerAttributes(clamp(a.passing() + delta), clamp(a.firstTouch() + delta), clamp(a.dribbling() + delta),
            clamp(a.tackling() + delta), clamp(a.finishing() + delta), clamp(a.pace() + delta), clamp(a.strength() + delta),
            clamp(a.stamina() + delta), clamp(a.aerial() + delta), clamp(a.decisions() + delta), clamp(a.positioning() + delta),
            clamp(a.composure() + delta), clamp(a.aggression() + delta), clamp(a.teamwork() + delta), clamp(a.handling() + delta),
            clamp(a.reflexes() + delta), clamp(a.oneOnOne() + delta), clamp(a.distribution() + delta));
    }

    private int clamp(int value) {
        return Math.max(1, Math.min(100, value));
    }

    private PlayerAttributes readAttributes(String value) {
        try {
            return json.readValue(value, PlayerAttributes.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored player attributes are invalid", exception);
        }
    }

    private List<CareerGameService.ClubStanding> readTable(String value) {
        try {
            return json.readValue(value, json.getTypeFactory().constructCollectionType(
                List.class, CareerGameService.ClubStanding.class));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored season table is invalid", exception);
        }
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Career season snapshot cannot be serialized", exception);
        }
    }

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
        private CareerGameService.ClubStanding view() {
            return new CareerGameService.ClubStanding(id, name, played, wins, draws, losses,
                goalsFor, goalsAgainst, difference(), points());
        }
    }
}
