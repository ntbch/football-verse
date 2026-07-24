package com.footballverse.game.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.dto.MatchEvent;
import com.footballverse.game.dto.MatchInput;
import com.footballverse.game.dto.MatchResult;
import com.footballverse.game.dto.PlayerStats;
import com.footballverse.game.dto.TeamStats;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class CareerMatchPersistenceService {
    private final CareerSaveRepository careerSaves;
    private final FixtureRepository fixtures;
    private final SimulatedMatchRepository matches;
    private final JdbcOperations jdbc;
    private final ObjectMapper objectMapper;

    public CareerMatchPersistenceService(CareerSaveRepository careerSaves,
                                         FixtureRepository fixtures,
                                         SimulatedMatchRepository matches,
                                         JdbcOperations jdbc,
                                         ObjectMapper objectMapper) {
        this.careerSaves = careerSaves;
        this.fixtures = fixtures;
        this.matches = matches;
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SimulatedMatchEntity store(Long ownerUserId, UUID careerSaveId, UUID fixtureId,
                                      String idempotencyKey, MatchInput input, MatchResult result) {
        requireIdentifiers(ownerUserId, careerSaveId, fixtureId, idempotencyKey);

        var existing = matches.findByOwnerUserIdAndIdempotencyKey(ownerUserId, idempotencyKey);
        if (existing.isPresent()) {
            return existing.get();
        }

        careerSaves.findByIdAndOwnerUserId(careerSaveId, ownerUserId)
            .orElseThrow(() -> new IllegalArgumentException("Career save not found"));
        var fixture = fixtures.findByIdAndCareerSaveId(fixtureId, careerSaveId)
            .orElseThrow(() -> new IllegalArgumentException("Fixture not found"));

        validateContract(fixture, input, result);

        var match = new SimulatedMatchEntity(
            careerSaveId, fixtureId, ownerUserId, idempotencyKey,
            input.seed(), input.engineVersion(), input.rulesetVersion(), toJson(input)
        );
        match.complete(toJson(result), result.homeScore(), result.awayScore());
        match = matches.saveAndFlush(match);

        persistEvents(match.getId(), safe(result.events()));
        persistTeamStats(match.getId(), result.stats().home());
        persistTeamStats(match.getId(), result.stats().away());
        for (var player : safe(result.stats().players())) {
            persistPlayerStats(match.getId(), player);
            applyPlayerState(careerSaveId, player);
        }

        fixture.markPlayed();
        fixtures.save(fixture);
        return match;
    }

    private void validateContract(FixtureEntity fixture, MatchInput input, MatchResult result) {
        if (input == null || input.home() == null || input.away() == null || result == null || result.stats() == null) {
            throw new IllegalArgumentException("Match input and result are required");
        }
        if (!Objects.equals(input.seed(), result.seed())
            || !Objects.equals(input.engineVersion(), result.engineVersion())
            || !Objects.equals(input.rulesetVersion(), result.rulesetVersion())) {
            throw new IllegalArgumentException("Match engine result does not match its input contract");
        }
        if (!fixture.getHomeClubId().equals(input.home().id())
            || !fixture.getAwayClubId().equals(input.away().id())
            || !input.home().id().equals(result.homeTeamId())
            || !input.away().id().equals(result.awayTeamId())) {
            throw new IllegalArgumentException("Match teams do not match the fixture");
        }
        if (result.stats().home() == null || result.stats().away() == null
            || !result.homeTeamId().equals(result.stats().home().teamId())
            || !result.awayTeamId().equals(result.stats().away().teamId())) {
            throw new IllegalArgumentException("Team stats do not match the result");
        }
    }

    private void persistEvents(UUID matchId, List<MatchEvent> events) {
        for (var event : events) {
            jdbc.update("""
                INSERT INTO match_events
                    (match_id, sequence, minute, second, type, team_id, player_id, zone, payload)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb))
                """, matchId, event.sequence(), event.minute(), event.second(), event.type().name(),
                event.teamId(), event.playerId(), event.zone() == null ? null : event.zone().name(),
                toJson(event.payload() == null ? java.util.Map.of() : event.payload()));
        }
    }

    private void persistTeamStats(UUID matchId, TeamStats stats) {
        jdbc.update("""
            INSERT INTO match_team_stats (match_id, team_id, stats)
            VALUES (?, ?, CAST(? AS jsonb))
            """, matchId, stats.teamId(), toJson(stats));
    }

    private void persistPlayerStats(UUID matchId, PlayerStats stats) {
        jdbc.update("""
            INSERT INTO match_player_stats (match_id, player_id, team_id, stats)
            VALUES (?, ?, ?, CAST(? AS jsonb))
            """, matchId, stats.playerId(), stats.teamId(), toJson(stats));
    }

    private void applyPlayerState(UUID careerSaveId, PlayerStats stats) {
        if (stats.minutes() <= 0) {
            return;
        }
        jdbc.update("""
            UPDATE players
            SET fitness = GREATEST(1, fitness - ?),
                form = LEAST(100, GREATEST(1, form + ?))
            WHERE id = ? AND career_save_id = ?
            """, fatigueCost(stats.minutes()), formDelta(stats.rating()), stats.playerId(), careerSaveId);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Match data cannot be serialized", exception);
        }
    }

    private static <T> List<T> safe(List<T> values) {
        return values == null ? List.of() : values;
    }

    static double fatigueCost(int minutes) {
        return Math.min(12.0, Math.max(1.0, minutes / 9.0));
    }

    static double formDelta(double rating) {
        return Math.min(8.0, Math.max(-8.0, (rating - 6.5) * 4.0));
    }

    private static void requireIdentifiers(Long ownerUserId, UUID careerSaveId, UUID fixtureId,
                                           String idempotencyKey) {
        if (ownerUserId == null || careerSaveId == null || fixtureId == null
            || idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 100) {
            throw new IllegalArgumentException("Owner, career, fixture and idempotency key are required");
        }
    }
}
