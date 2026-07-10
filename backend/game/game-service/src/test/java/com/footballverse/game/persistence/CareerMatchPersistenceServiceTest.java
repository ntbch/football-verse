package com.footballverse.game.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.dto.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcOperations;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class CareerMatchPersistenceServiceTest {
    private final CareerSaveRepository careerSaves = mock(CareerSaveRepository.class);
    private final FixtureRepository fixtures = mock(FixtureRepository.class);
    private final SimulatedMatchRepository matches = mock(SimulatedMatchRepository.class);
    private final JdbcOperations jdbc = mock(JdbcOperations.class);
    private final CareerMatchPersistenceService service = new CareerMatchPersistenceService(
        careerSaves, fixtures, matches, jdbc, new ObjectMapper()
    );

    @Test
    void storesCompletedMatchAndMarksFixturePlayed() {
        long ownerId = 42L;
        var career = new CareerSaveEntity(ownerId, "Career", LocalDate.of(2026, 7, 10));
        var homeId = UUID.randomUUID();
        var awayId = UUID.randomUUID();
        var fixture = new FixtureEntity(career.getId(), homeId, awayId, LocalDate.of(2026, 7, 11));
        var input = input(homeId, awayId);
        var result = result(homeId, awayId);

        when(careerSaves.findByIdAndOwnerUserId(career.getId(), ownerId)).thenReturn(Optional.of(career));
        when(fixtures.findByIdAndCareerSaveId(fixture.getId(), career.getId())).thenReturn(Optional.of(fixture));
        when(matches.findByOwnerUserIdAndIdempotencyKey(ownerId, "fixture-1")).thenReturn(Optional.empty());
        when(matches.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var stored = service.store(ownerId, career.getId(), fixture.getId(), "fixture-1", input, result);

        assertThat(stored.getStatus()).isEqualTo("COMPLETED");
        assertThat(stored.getHomeScore()).isEqualTo(1);
        assertThat(stored.getAwayScore()).isZero();
        assertThat(fixture.getStatus()).isEqualTo("PLAYED");
        verify(jdbc, times(5)).update(anyString(), any(Object[].class));
        verify(jdbc).update(contains("UPDATE players"), eq(10.0), eq(4.0), any(UUID.class), eq(career.getId()));
        verify(fixtures).save(fixture);
    }

    @Test
    void keepsPlayerStateAdjustmentsBounded() {
        assertThat(CareerMatchPersistenceService.fatigueCost(90)).isEqualTo(10.0);
        assertThat(CareerMatchPersistenceService.fatigueCost(180)).isEqualTo(12.0);
        assertThat(CareerMatchPersistenceService.formDelta(9.0)).isEqualTo(8.0);
        assertThat(CareerMatchPersistenceService.formDelta(4.0)).isEqualTo(-8.0);
    }

    @Test
    void returnsExistingMatchForRepeatedIdempotencyKey() {
        var careerId = UUID.randomUUID();
        var fixtureId = UUID.randomUUID();
        var existing = new SimulatedMatchEntity(
            careerId, fixtureId, 42L, "same-key", 99L, "0.1.0", "2026.1", "{}"
        );
        when(matches.findByOwnerUserIdAndIdempotencyKey(42L, "same-key"))
            .thenReturn(Optional.of(existing));

        var stored = service.store(42L, careerId, fixtureId, "same-key", null, null);

        assertThat(stored).isSameAs(existing);
        verifyNoInteractions(careerSaves, fixtures, jdbc);
        verify(matches, never()).saveAndFlush(any());
    }

    private static MatchInput input(UUID homeId, UUID awayId) {
        return new MatchInput(
            99L, "0.1.0", "2026.1",
            new TeamSnapshot(homeId, "Home", List.of(), null, null),
            new TeamSnapshot(awayId, "Away", List.of(), null, null)
        );
    }

    private static MatchResult result(UUID homeId, UUID awayId) {
        var homeStats = new TeamStats(homeId, 1, 3, 2, 1.2, 54, 100, 82, 4, 0, 0);
        var awayStats = new TeamStats(awayId, 0, 2, 1, 0.5, 46, 90, 70, 6, 1, 0);
        var playerStats = new PlayerStats(UUID.randomUUID(), homeId, 90, 7.5, 1, 0, 2, 20, 18, 1);
        var event = new MatchEvent(1, 12, 5, EventType.GOAL, homeId, playerStats.playerId(),
            Zone.BOX, Map.of("xg", 0.4));
        return new MatchResult(99L, "0.1.0", "2026.1", homeId, awayId, 1, 0,
            List.of(event), new MatchStats(homeStats, awayStats, List.of(playerStats)));
    }
}
