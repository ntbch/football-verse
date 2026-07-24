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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CareerGameService {
    private static final String ENGINE_VERSION = "0.1.0";
    private static final String RULESET_VERSION = "1";

    private final CareerSaveRepository careers;
    private final FixtureRepository fixtures;
    private final SimulatedMatchRepository matches;
    private final CareerMatchPersistenceService persistence;
    private final MatchEngineClient engine;
    private final JdbcOperations jdbc;
    private final ObjectMapper json;
    private final ManagerService managers;
    private final CareerSaveLifecycleService lifecycle;
    private final CareerSeasonService seasons;
    private final CareerRosterService rosters;
    // ponytail: process-local lock fits one game-service instance; use a DB lease before horizontal scaling.
    private final Map<UUID, Object> matchdayLocks = new ConcurrentHashMap<>();

    public CareerGameService(CareerSaveRepository careers, FixtureRepository fixtures,
                             SimulatedMatchRepository matches, CareerMatchPersistenceService persistence,
                             MatchEngineClient engine, JdbcOperations jdbc, ObjectMapper json) {
        this(careers, fixtures, matches, persistence, engine, jdbc, json, null,
            new CareerSaveLifecycleService(careers, fixtures, jdbc, null, json), null, null);
    }

    @Autowired
    public CareerGameService(CareerSaveRepository careers, FixtureRepository fixtures,
                             SimulatedMatchRepository matches, CareerMatchPersistenceService persistence,
                             MatchEngineClient engine, JdbcOperations jdbc, ObjectMapper json, ManagerService managers,
                             CareerSaveLifecycleService lifecycle, CareerSeasonService seasons,
                             CareerRosterService rosters) {
        this.careers = careers;
        this.fixtures = fixtures;
        this.matches = matches;
        this.persistence = persistence;
        this.engine = engine;
        this.jdbc = jdbc;
        this.json = json;
        this.managers = managers;
        this.lifecycle = lifecycle;
        this.seasons = seasons == null ? new CareerSeasonService(lifecycle, careers, fixtures, jdbc, json) : seasons;
        this.rosters = rosters == null ? new CareerRosterService(lifecycle, jdbc, json, managers) : rosters;
    }

    @Transactional
    public CareerSaveEntity create(Long ownerUserId, String name) {
        return lifecycle.create(ownerUserId, name);
    }

    public List<CareerSaveEntity> list(Long ownerUserId) {
        return lifecycle.list(ownerUserId);
    }

    @Transactional
    public CareerSaveEntity rename(Long ownerUserId, UUID careerId, String name) {
        return lifecycle.rename(ownerUserId, careerId, name);
    }

    @Transactional
    public void delete(Long ownerUserId, UUID careerId) {
        lifecycle.delete(ownerUserId, careerId);
    }

    public CareerSaveEntity get(Long ownerUserId, UUID careerId) {
        return lifecycle.get(ownerUserId, careerId);
    }

    public List<FixtureEntity> fixtures(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        return fixtures.findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(careerId, career.getSeasonNumber());
    }

    @Transactional
    public CareerSaveEntity advanceDay(Long ownerUserId, UUID careerId) {
        return seasons.advanceDay(ownerUserId, careerId);
    }

    @Transactional
    public CareerSaveEntity setTrainingFocus(Long ownerUserId, UUID careerId, String focus) {
        return lifecycle.setTrainingFocus(ownerUserId, careerId, focus);
    }

    public List<ClubStanding> standings(Long ownerUserId, UUID careerId) {
        return seasons.standings(ownerUserId, careerId);
    }

    public SeasonSummary seasonSummary(Long ownerUserId, UUID careerId) {
        return seasons.summary(ownerUserId, careerId);
    }

    public List<SeasonRecord> history(Long ownerUserId, UUID careerId) {
        return seasons.history(ownerUserId, careerId);
    }

    public List<PlayerSeasonStats> playerStats(Long ownerUserId, UUID careerId) {
        return seasons.playerStats(ownerUserId, careerId);
    }

    public PageResult<PlayerSeasonStats> playerStatsPage(Long ownerUserId, UUID careerId, int page, int size, String query) {
        return seasons.playerStatsPage(ownerUserId, careerId, page, size, query);
    }

    @Transactional
    public CareerSaveEntity nextSeason(Long ownerUserId, UUID careerId) {
        return seasons.nextSeason(ownerUserId, careerId);
    }

    public PlayedMatchday play(Long ownerUserId, UUID careerId, UUID fixtureId, long seed,
                               Lineup requestedLineup, Tactic requestedTactic) {
        var career = get(ownerUserId, careerId);
        if (!"ACTIVE".equals(career.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Career season is finished");
        }
        var existing = matches.findByFixtureIdAndOwnerUserId(fixtureId, ownerUserId);
        if (existing.isPresent()) {
            var fixture = fixtures.findByIdAndCareerSaveId(fixtureId, careerId).orElseThrow(this::notFound);
            var completion = completeMatchday(ownerUserId, careerId, fixture.getMatchdayNumber());
            return playedMatchday(existing.get(), fixture.getMatchdayNumber(), completion);
        }
        var prepared = prepareFixture(career, fixtureId, seed, requestedLineup, requestedTactic);
        return storePrepared(ownerUserId, prepared, "fixture-" + fixtureId, engine.simulate(prepared.input()));
    }

    public PreparedMatch prepareInteractive(Long ownerUserId, UUID careerId, UUID fixtureId, long seed,
                                            Lineup requestedLineup, Tactic requestedTactic) {
        var career = get(ownerUserId, careerId);
        if (matches.findByFixtureIdAndOwnerUserId(fixtureId, ownerUserId).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Fixture is already played");
        return prepareFixture(career, fixtureId, seed, requestedLineup, requestedTactic);
    }

    @Transactional
    public PlayedMatchday finishInteractive(Long ownerUserId, UUID careerId, UUID fixtureId, MatchInput input,
                                            String idempotencyKey, MatchResult result) {
        get(ownerUserId, careerId);
        var fixture = fixtures.findByIdAndCareerSaveId(fixtureId, careerId).orElseThrow(this::notFound);
        var prepared = new PreparedMatch(careerId, fixture, input);
        return storePrepared(ownerUserId, prepared, idempotencyKey, result);
    }

    private PreparedMatch prepareFixture(CareerSaveEntity career, UUID fixtureId, long seed,
                                         Lineup requestedLineup, Tactic requestedTactic) {
        if (!"ACTIVE".equals(career.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Career season is finished");
        }
        var careerId = career.getId();
        var fixture = fixtures.findByIdAndCareerSaveId(fixtureId, careerId).orElseThrow(this::notFound);
        if (fixture.getMatchDate().isAfter(career.getGameDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Advance the Career date to play this fixture");
        }
        if (!"SCHEDULED".equals(fixture.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Fixture is not scheduled");
        }
        var managedId = career.getManagedClubId();
        if (managedId == null || (!fixture.getHomeClubId().equals(managedId) && !fixture.getAwayClubId().equals(managedId)))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only the managed club fixture can be played");
        var opponentId = fixture.getHomeClubId().equals(managedId) ? fixture.getAwayClubId() : fixture.getHomeClubId();
        var managed = rosters.team(managedId, requestedLineup, requestedTactic);
        var opponent = rosters.team(opponentId, null, rosters.aiTactic(opponentId, managedId, managed.tactic()));
        var input = orderTeams(fixture, managed, opponent, seed);
        return new PreparedMatch(careerId, fixture, input);
    }

    private PlayedMatchday storePrepared(Long ownerUserId, PreparedMatch prepared, String idempotencyKey,
                                         MatchResult result) {
        var career = get(ownerUserId, prepared.careerId());
        var fixture = prepared.fixture();
        var stored = persistence.store(ownerUserId, career.getId(), fixture.getId(), idempotencyKey,
            prepared.input(), result);
        applyAvailabilityEvents(career, result);
        if (managers != null) managers.record(career.getId(), fixture.getHomeClubId(), fixture.getAwayClubId(),
            result.homeScore(), result.awayScore(), career.getGameDate());
        var completion = completeMatchday(ownerUserId, career.getId(), fixture.getMatchdayNumber());
        return playedMatchday(stored, fixture.getMatchdayNumber(), completion);
    }

    public MatchdayCompletion completeMatchday(Long ownerUserId, UUID careerId, int matchdayNumber) {
        synchronized (matchdayLocks.computeIfAbsent(careerId, ignored -> new Object())) {
            return completeMatchdayUnlocked(ownerUserId, careerId, matchdayNumber);
        }
    }

    private MatchdayCompletion completeMatchdayUnlocked(Long ownerUserId, UUID careerId, int matchdayNumber) {
        var career = get(ownerUserId, careerId);
        var seasonFixtures = fixtures.findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(careerId, career.getSeasonNumber());
        if (career.getManagedClubId() != null && seasonFixtures.stream().anyMatch(fixture ->
            fixture.getMatchdayNumber() == matchdayNumber && "SCHEDULED".equals(fixture.getStatus()) &&
                (fixture.getHomeClubId().equals(career.getManagedClubId()) || fixture.getAwayClubId().equals(career.getManagedClubId()))))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Play your fixture before completing the matchday");
        var pending = seasonFixtures.stream()
            .filter(fixture -> fixture.getMatchdayNumber() == matchdayNumber && "SCHEDULED".equals(fixture.getStatus()))
            .filter(fixture -> career.getManagedClubId() == null ||
                (!fixture.getHomeClubId().equals(career.getManagedClubId()) && !fixture.getAwayClubId().equals(career.getManagedClubId())))
            .toList();
        var simulated = new ArrayList<UUID>(); var failed = new ArrayList<UUID>();
        try (var executor = Executors.newFixedThreadPool(3, Thread.ofVirtual().factory())) {
            var jobs = new ArrayList<AiJob>();
            for (var fixture : pending) {
                try {
                    var input = aiInput(career, fixture);
                    jobs.add(new AiJob(fixture, input, CompletableFuture.supplyAsync(() -> engine.simulate(input), executor)));
                } catch (RuntimeException exception) {
                    failed.add(fixture.getId());
                }
            }
            for (var job : jobs) {
                try {
                    var result = job.result().join();
                    var stored = persistence.store(ownerUserId, careerId, job.fixture().getId(),
                        "ai-" + career.getSeasonNumber() + "-" + job.fixture().getId(), job.input(), result);
                    applyAvailabilityEvents(career, result);
                    if (managers != null) managers.record(careerId, job.fixture().getHomeClubId(), job.fixture().getAwayClubId(),
                        result.homeScore(), result.awayScore(), career.getGameDate());
                    simulated.add(stored.getId());
                } catch (RuntimeException exception) {
                    failed.add(job.fixture().getId());
                }
            }
        }
        var complete = fixtures.findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(careerId, career.getSeasonNumber()).stream()
            .filter(fixture -> fixture.getMatchdayNumber() == matchdayNumber).noneMatch(fixture -> "SCHEDULED".equals(fixture.getStatus()));
        if (complete) seasons.finishIfComplete(career);
        return new MatchdayCompletion(matchdayNumber, simulated, failed, complete);
    }

    public void completeDueAiMatchdays(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        if (career.getManagedClubId() != null) return;
        fixtures.findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(careerId, career.getSeasonNumber()).stream()
            .filter(fixture -> "SCHEDULED".equals(fixture.getStatus()) && !fixture.getMatchDate().isAfter(career.getGameDate()))
            .map(FixtureEntity::getMatchdayNumber).distinct().forEach(matchday -> completeMatchday(ownerUserId, careerId, matchday));
    }

    private MatchInput aiInput(CareerSaveEntity career, FixtureEntity fixture) {
        var homeTactic = rosters.aiTactic(fixture.getHomeClubId(), fixture.getAwayClubId(), null);
        var home = rosters.team(fixture.getHomeClubId(), null, homeTactic);
        var away = rosters.team(fixture.getAwayClubId(), null,
            rosters.aiTactic(fixture.getAwayClubId(), fixture.getHomeClubId(), homeTactic));
        return new MatchInput(Integer.toUnsignedLong(Objects.hash(career.getId(), career.getSeasonNumber(), fixture.getId())),
            ENGINE_VERSION, RULESET_VERSION, home, away);
    }

    static MatchInput orderTeams(FixtureEntity fixture, TeamSnapshot managed, TeamSnapshot opponent, long seed) {
        return new MatchInput(seed, ENGINE_VERSION, RULESET_VERSION,
            fixture.getHomeClubId().equals(managed.id()) ? managed : opponent,
            fixture.getAwayClubId().equals(managed.id()) ? managed : opponent);
    }

    public String clubName(UUID clubId) {
        return rosters.clubName(clubId);
    }

    public List<PlayerSnapshot> squad(Long ownerUserId, UUID careerId, UUID clubId) {
        return rosters.squad(ownerUserId, careerId, clubId);
    }

    public JsonNode match(Long ownerUserId, UUID careerId, UUID matchId) {
        get(ownerUserId, careerId);
        return result(matches.findByIdAndCareerSaveIdAndOwnerUserId(matchId, careerId, ownerUserId)
            .orElseThrow(this::notFound));
    }

    public JsonNode events(Long ownerUserId, UUID careerId, UUID matchId) {
        return match(ownerUserId, careerId, matchId).path("events");
    }

    static List<ScheduledPair> schedule(List<UUID> clubIds) {
        if (clubIds.size() < 2 || clubIds.size() % 2 != 0) throw new IllegalArgumentException("League needs an even club count");
        var rotation = new ArrayList<>(clubIds);
        var firstLeg = new ArrayList<ScheduledPair>();
        for (int round = 1; round < clubIds.size(); round++) {
            for (int index = 0; index < clubIds.size() / 2; index++) {
                var left = rotation.get(index); var right = rotation.get(clubIds.size() - 1 - index);
                firstLeg.add(round % 2 == 0 ? new ScheduledPair(round, right, left) : new ScheduledPair(round, left, right));
            }
            var moved = rotation.removeLast(); rotation.add(1, moved);
        }
        var schedule = new ArrayList<>(firstLeg);
        firstLeg.forEach(pair -> schedule.add(new ScheduledPair(pair.matchday() + clubIds.size() - 1, pair.away(), pair.home())));
        return schedule;
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

    private PlayedMatchday playedMatchday(SimulatedMatchEntity match, int matchday, MatchdayCompletion completion) {
        return new PlayedMatchday(match.getId(), result(match), matchday, completion.simulatedMatchIds(),
            completion.failedFixtureIds(), completion.complete());
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Career resource not found");
    }

    public record PreparedMatch(UUID careerId, FixtureEntity fixture, MatchInput input) {}
    public record PlayedMatchday(UUID matchId, JsonNode result, int matchdayNumber, List<UUID> simulatedAiMatchIds,
                                 List<UUID> failedFixtureIds, boolean matchdayComplete) {}
    public record MatchdayCompletion(int matchdayNumber, List<UUID> simulatedMatchIds, List<UUID> failedFixtureIds, boolean complete) {}
    public record ClubStanding(UUID clubId, String clubName, int played, int wins, int draws, int losses,
                               int goalsFor, int goalsAgainst, int goalDifference, int points) {}
    public record SeasonSummary(int seasonNumber, UUID championClubId, String championClubName,
                                List<ClubStanding> finalTable) {}
    public record SeasonRecord(int seasonNumber, UUID championClubId, String championClubName,
                               List<ClubStanding> finalTable) {}
    public record PlayerSeasonStats(UUID playerId, String playerName, UUID clubId, String clubName,
                                    int appearances, int minutes, int goals, int assists, double averageRating) {}
    record ScheduledPair(int matchday, UUID home, UUID away) {}
    private record AiJob(FixtureEntity fixture, MatchInput input, CompletableFuture<MatchResult> result) {}

}
