package com.footballverse.game.persistence;

import com.footballverse.game.dto.*;
import com.footballverse.game.career.CareerGameService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "app.internal-token=test-token")
@EnabledIfSystemProperty(named = "runPostgresIntegrationTests", matches = "true")
class CareerMatchPersistencePostgresTest {
    @Autowired CareerSaveRepository careerSaves;
    @Autowired FixtureRepository fixtures;
    @Autowired SimulatedMatchRepository matches;
    @Autowired CareerMatchPersistenceService persistence;
    @Autowired CareerGameService careerGame;
    @Autowired JdbcTemplate jdbc;
    private UUID testCareerId;

    @AfterEach
    void cleanTestCareer() {
        if (testCareerId != null) {
            jdbc.update("DELETE FROM career_saves WHERE id = ?", testCareerId);
        }
    }

    @Test
    void migratesStoresAndReloadsCareerMatch() {
        long ownerId = 42L;
        var career = careerSaves.saveAndFlush(
            new CareerSaveEntity(ownerId, "Career", LocalDate.of(2026, 7, 10))
        );
        testCareerId = career.getId();
        var homeId = UUID.randomUUID();
        var awayId = UUID.randomUUID();
        insertClub(homeId, career.getId(), "Home");
        insertClub(awayId, career.getId(), "Away");
        var fixture = fixtures.saveAndFlush(
            new FixtureEntity(career.getId(), homeId, awayId, LocalDate.of(2026, 7, 11))
        );

        var stored = persistence.store(
            ownerId, career.getId(), fixture.getId(), "fixture-" + fixture.getId(),
            input(homeId, awayId), result(homeId, awayId)
        );

        var reloaded = matches.findById(stored.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo("COMPLETED");
        assertThat(reloaded.getInputSnapshot()).contains("engine_version");
        assertThat(fixtures.findById(fixture.getId()).orElseThrow().getStatus()).isEqualTo("PLAYED");
        assertThat(count("match_events", stored.getId())).isEqualTo(1);
        assertThat(count("match_team_stats", stored.getId())).isEqualTo(2);
        assertThat(count("match_player_stats", stored.getId())).isEqualTo(1);
    }

    @Test
    void createsCareerAndPlaysFixtureThroughMatchEngine() {
        long ownerId = 43L;
        var career = careerGame.create(ownerId, "Engine Career");
        testCareerId = career.getId();
        var fixture = careerGame.fixtures(ownerId, career.getId()).getFirst();
        var starters = careerGame.squad(ownerId, career.getId(), fixture.getHomeClubId()).stream()
            .map(player -> new LineupSlot(player.id(), player.primaryPosition(), role(player.primaryPosition())))
            .toList();
        var lineup = new Lineup(Formation.FOUR_THREE_THREE, starters, List.of());
        var tactic = new Tactic(Mentality.POSITIVE, Tempo.FAST, Width.WIDE, PassingStyle.MIXED,
            Pressing.HIGH, DefensiveLine.HIGH, Transition.COUNTER, TimeWasting.OFF);
        careerGame.advanceDay(ownerId, career.getId());

        var result = careerGame.play(ownerId, career.getId(), fixture.getId(), 123L, lineup, tactic);
        var stored = matches.findByFixtureIdAndOwnerUserId(fixture.getId(), ownerId).orElseThrow();

        assertThat(result.matchId()).isEqualTo(stored.getId());
        assertThat(result.result().path("seed").asLong()).isEqualTo(123L);
        assertThat(result.result().path("events")).isNotEmpty();
        assertThat(careerGame.match(ownerId, career.getId(), stored.getId())).isEqualTo(result.result());
        assertThat(careerGame.events(ownerId, career.getId(), stored.getId())).isEqualTo(result.result().path("events"));
        assertThat(careerGame.standings(ownerId, career.getId())).hasSize(4);
    }

    private void insertClub(UUID id, UUID careerId, String name) {
        jdbc.update("INSERT INTO clubs (id, career_save_id, name) VALUES (?, ?, ?)", id, careerId, name);
    }

    private int count(String table, UUID matchId) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE match_id = ?", Integer.class, matchId);
    }

    private static PlayerRole role(Position position) {
        return switch (position) {
            case GK -> PlayerRole.GOALKEEPER;
            case LB, RB -> PlayerRole.FULL_BACK;
            case CB -> PlayerRole.CENTRAL_DEFENDER;
            case CM -> PlayerRole.CENTRAL_MIDFIELDER;
            case LW, RW -> PlayerRole.WINGER;
            case ST -> PlayerRole.POACHER;
            default -> throw new IllegalArgumentException("Unsupported test position " + position);
        };
    }

    private static MatchInput input(UUID homeId, UUID awayId) {
        return new MatchInput(
            99L, "0.1.0", "2026.1",
            new TeamSnapshot(homeId, "Home", List.of(), null, null),
            new TeamSnapshot(awayId, "Away", List.of(), null, null)
        );
    }

    private static MatchResult result(UUID homeId, UUID awayId) {
        var scorerId = UUID.randomUUID();
        var homeStats = new TeamStats(homeId, 1, 3, 2, 1.2, 54, 100, 82, 4, 0, 0);
        var awayStats = new TeamStats(awayId, 0, 2, 1, 0.5, 46, 90, 70, 6, 1, 0);
        var playerStats = new PlayerStats(scorerId, homeId, 90, 7.5, 1, 0, 2, 20, 18, 1);
        var event = new MatchEvent(1, 12, 5, EventType.GOAL, homeId, scorerId,
            Zone.BOX, Map.of("xg", 0.4));
        return new MatchResult(99L, "0.1.0", "2026.1", homeId, awayId, 1, 0,
            List.of(event), new MatchStats(homeStats, awayStats, List.of(playerStats)));
    }
}
