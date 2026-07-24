package com.footballverse.game.persistence;

import com.footballverse.game.dto.*;
import com.footballverse.game.career.CareerGameService;
import com.footballverse.game.career.TransferMarketService;
import com.footballverse.game.career.ManagerService;
import com.footballverse.game.career.InteractiveMatchService;
import com.footballverse.game.career.CareerMutationLedgerService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = "app.internal-token=test-token")
@EnabledIfSystemProperty(named = "runPostgresIntegrationTests", matches = "true")
class CareerMatchPersistencePostgresTest {
    @Autowired CareerSaveRepository careerSaves;
    @Autowired FixtureRepository fixtures;
    @Autowired SimulatedMatchRepository matches;
    @Autowired CareerMatchPersistenceService persistence;
    @Autowired CareerGameService careerGame;
    @Autowired TransferMarketService transferMarket;
    @Autowired ManagerService managerService;
    @Autowired InteractiveMatchService interactiveMatches;
    @Autowired CareerMutationLedgerService operationLedger;
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
        careerGame.advanceDay(ownerId, career.getId());

        var result = careerGame.play(ownerId, career.getId(), fixture.getId(), 123L, null, null);
        var stored = matches.findByFixtureIdAndOwnerUserId(fixture.getId(), ownerId).orElseThrow();

        assertThat(result.matchId()).isEqualTo(stored.getId());
        assertThat(result.result().path("seed").asLong()).isEqualTo(123L);
        assertThat(result.result().path("events")).isNotEmpty();
        assertThat(careerGame.match(ownerId, career.getId(), stored.getId())).isEqualTo(result.result());
        assertThat(careerGame.events(ownerId, career.getId(), stored.getId())).isEqualTo(result.result().path("events"));
        assertThat(result.simulatedAiMatchIds()).hasSize(3);
        assertThat(result.matchdayComplete()).isTrue();
        assertThat(careerGame.standings(ownerId, career.getId())).hasSize(8);
    }

    @Test
    void scoutsNegotiatesAndCompletesTransferAtomically() {
        long ownerId = 44L;
        var career = careerGame.create(ownerId, "Transfer Career");
        testCareerId = career.getId();
        var buyer = career.getManagedClubId();
        var candidate = transferMarket.market(ownerId, career.getId(), buyer).players().getFirst();
        jdbc.update("UPDATE clubs SET balance=10000000, wage_budget=1000000 WHERE id=?", buyer);

        transferMarket.scout(ownerId, career.getId(), buyer, candidate.playerId());
        var offer = transferMarket.submit(ownerId, career.getId(), buyer, candidate.playerId(), BigDecimal.valueOf(1_000_000));
        jdbc.update("UPDATE players SET transfer_status='LISTED' WHERE id=?", candidate.playerId());
        transferMarket.advanceDay(ownerId, career.getId());
        transferMarket.terms(ownerId, career.getId(), buyer, offer.id(), BigDecimal.valueOf(50_000), 3, "STARTER");
        var completed = transferMarket.complete(ownerId, career.getId(), buyer, offer.id());

        assertThat(completed.status()).isEqualTo("COMPLETED");
        assertThat(jdbc.queryForObject("SELECT club_id FROM players WHERE id=?", UUID.class, candidate.playerId())).isEqualTo(buyer);
        assertThat(transferMarket.complete(ownerId, career.getId(), buyer, offer.id()).status()).isEqualTo("COMPLETED");
    }

    @Test
    void dismissesPlayerManagerAndAcceptsVacantJobWithoutEndingCareer() {
        long ownerId = 45L;
        var career = careerGame.create(ownerId, "Manager Career");
        testCareerId = career.getId();
        var club = career.getManagedClubId();
        var manager = managerService.dashboard(ownerId, career.getId());

        managerService.dismiss(ownerId, career.getId(), manager.id(), "Board review");
        var unemployed = careerSaves.findById(career.getId()).orElseThrow();
        assertThat(unemployed.getStatus()).isEqualTo("UNEMPLOYED");
        assertThat(unemployed.getManagedClubId()).isNull();

        managerService.acceptJob(ownerId, career.getId(), club);
        var employed = careerSaves.findById(career.getId()).orElseThrow();
        assertThat(employed.getStatus()).isEqualTo("ACTIVE");
        assertThat(employed.getManagedClubId()).isEqualTo(club);
    }

    @Test
    void cleansExpiredSessionsAndTheirIdempotencyResponses() {
        long ownerId = 46L;
        var career = careerSaves.saveAndFlush(new CareerSaveEntity(ownerId, "Expired Matchday", LocalDate.now()));
        testCareerId = career.getId();
        var homeId = UUID.randomUUID();
        var awayId = UUID.randomUUID();
        insertClub(homeId, career.getId(), "Home");
        insertClub(awayId, career.getId(), "Away");
        var fixture = fixtures.saveAndFlush(new FixtureEntity(career.getId(), homeId, awayId, LocalDate.now()));
        var sessionId = UUID.randomUUID();
        var requestId = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO match_sessions
              (id, career_save_id, fixture_id, owner_user_id, request_id, status, input_snapshot,
               state_snapshot, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'ABANDONED', CAST(? AS jsonb), CAST(? AS jsonb), 0,
                    now() - interval '31 days', now() - interval '31 days')
            """, sessionId, career.getId(), fixture.getId(), ownerId, UUID.randomUUID(), "{}", "{}");
        jdbc.update("""
            INSERT INTO match_session_requests
              (request_id, session_id, career_save_id, owner_user_id, action, response_snapshot)
            VALUES (?, ?, ?, ?, 'ABANDON', CAST(? AS jsonb))
            """, requestId, sessionId, career.getId(), ownerId, "{}");

        interactiveMatches.cleanupCompletedSessions();

        assertThat(jdbc.queryForObject("SELECT count(*) FROM match_sessions WHERE id=?", Integer.class, sessionId)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM match_session_requests WHERE request_id=?", Integer.class, requestId)).isZero();
    }

    @Test
    void replaysConcurrentInteractiveRequestsAndRejectsAStaleVersion() throws Exception {
        long ownerId = 47L;
        var career = careerGame.create(ownerId, "Concurrent Matchday");
        testCareerId = career.getId();
        var fixture = careerGame.fixtures(ownerId, career.getId()).getFirst();
        careerGame.advanceDay(ownerId, career.getId());
        var startRequest = UUID.randomUUID();
        var started = interactiveMatches.start(ownerId, career.getId(), fixture.getId(), startRequest, 321L, null, null);
        assertThat(interactiveMatches.start(ownerId, career.getId(), fixture.getId(), startRequest, 321L, null, null))
            .isEqualTo(started);

        var continueRequest = UUID.randomUUID();
        var ready = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = CompletableFuture.supplyAsync(() -> awaitThenAdvance(ready, ownerId, career.getId(),
                started.id(), continueRequest, started.version()), executor);
            var second = CompletableFuture.supplyAsync(() -> awaitThenAdvance(ready, ownerId, career.getId(),
                started.id(), continueRequest, started.version()), executor);
            ready.countDown();
            assertThat(first.join()).isEqualTo(second.join());
        }

        assertThatThrownBy(() -> interactiveMatches.advance(ownerId, career.getId(), started.id(), UUID.randomUUID(), started.version()))
            .isInstanceOfSatisfying(InteractiveMatchService.Conflict.class, conflict -> {
                assertThat(conflict.careerId()).isEqualTo(career.getId());
                assertThat(conflict.sessionId()).isEqualTo(started.id());
            });
        var current = interactiveMatches.get(ownerId, career.getId(), started.id());
        var abandonRequest = UUID.randomUUID();
        interactiveMatches.abandon(ownerId, career.getId(), started.id(), abandonRequest, current.version());
        interactiveMatches.abandon(ownerId, career.getId(), started.id(), abandonRequest, current.version());
        assertThat(interactiveMatches.active(ownerId, career.getId())).isNull();
    }

    @Test
    void operationLedgerUsesDedicatedTableAndExecutesConcurrentDeliveryOnce() {
        long ownerId = 48L;
        var career = careerSaves.saveAndFlush(new CareerSaveEntity(ownerId, "Operation Ledger", LocalDate.now()));
        testCareerId = career.getId();
        var requestId = UUID.randomUUID();
        var calls = new AtomicInteger();
        var ready = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = CompletableFuture.supplyAsync(() -> awaitThenExecute(
                ready, ownerId, career.getId(), requestId, calls), executor);
            var second = CompletableFuture.supplyAsync(() -> awaitThenExecute(
                ready, ownerId, career.getId(), requestId, calls), executor);
            ready.countDown();
            assertThat(first.join()).isEqualTo("saved");
            assertThat(second.join()).isEqualTo("saved");
        }

        assertThat(calls).hasValue(1);
        assertThat(jdbc.queryForObject(
            "SELECT count(*) FROM career_operation_requests WHERE request_id=?", Integer.class, requestId)).isOne();
        var status = operationLedger.status(ownerId, career.getId(), requestId);
        assertThat(status.state()).isEqualTo("COMPLETED");
        assertThat(status.response().asText()).isEqualTo("saved");
    }

    private String awaitThenExecute(CountDownLatch ready, long ownerId, UUID careerId,
                                    UUID requestId, AtomicInteger calls) {
        try { ready.await(); }
        catch (InterruptedException exception) { Thread.currentThread().interrupt(); throw new IllegalStateException(exception); }
        return operationLedger.execute(ownerId, careerId, requestId, "TEST_OPERATION", String.class, () -> {
            calls.incrementAndGet();
            return "saved";
        });
    }

    private InteractiveMatchService.Snapshot awaitThenAdvance(CountDownLatch ready, long ownerId, UUID careerId,
                                                               UUID sessionId, UUID requestId, long version) {
        try { ready.await(); }
        catch (InterruptedException exception) { Thread.currentThread().interrupt(); throw new IllegalStateException(exception); }
        return interactiveMatches.advance(ownerId, careerId, sessionId, requestId, version);
    }

    private void insertClub(UUID id, UUID careerId, String name) {
        jdbc.update("INSERT INTO clubs (id, career_save_id, name) VALUES (?, ?, ?)", id, careerId, name);
    }

    private int count(String table, UUID matchId) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE match_id = ?", Integer.class, matchId);
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
