package com.footballverse.game.career;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.engine.MatchEngineClient;
import com.footballverse.game.persistence.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcOperations;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class CareerSeasonServiceTest {
    @Test
    void newCareerCreatesSixFixturesForFourClubRoundRobin() {
        var careers = mock(CareerSaveRepository.class);
        var fixtures = mock(FixtureRepository.class);
        var matches = mock(SimulatedMatchRepository.class);
        var jdbc = mock(JdbcOperations.class);
        var persistence = new CareerMatchPersistenceService(careers, fixtures, matches, jdbc, new ObjectMapper());
        var service = new CareerGameService(careers, fixtures, matches, persistence,
            new MatchEngineClient("http://unused"), jdbc, new ObjectMapper());
        when(careers.saveAndFlush(any(CareerSaveEntity.class))).thenAnswer(call -> call.getArgument(0));

        var career = service.create(42L, "Season");

        var captured = ArgumentCaptor.forClass(FixtureEntity.class);
        verify(fixtures, times(6)).save(captured.capture());
        assertThat(captured.getAllValues()).allSatisfy(fixture -> assertThat(fixture.getCareerSaveId()).isEqualTo(career.getId()));
        assertThat(new HashSet<>(captured.getAllValues().stream().map(FixtureEntity::getMatchDate).toList())).hasSize(6);
    }

    @Test
    void advanceDayRecoversSquadFitness() {
        var careers = mock(CareerSaveRepository.class);
        var fixtures = mock(FixtureRepository.class);
        var matches = mock(SimulatedMatchRepository.class);
        var jdbc = mock(JdbcOperations.class);
        var persistence = new CareerMatchPersistenceService(careers, fixtures, matches, jdbc, new ObjectMapper());
        var service = new CareerGameService(careers, fixtures, matches, persistence,
            new MatchEngineClient("http://unused"), jdbc, new ObjectMapper());
        var career = new CareerSaveEntity(42L, "Season", LocalDate.of(2026, 7, 10));
        when(careers.findByIdAndOwnerUserId(career.getId(), 42L)).thenReturn(Optional.of(career));
        when(careers.save(any(CareerSaveEntity.class))).thenAnswer(call -> call.getArgument(0));

        var advanced = service.advanceDay(42L, career.getId());

        assertThat(advanced.getGameDate()).isEqualTo(LocalDate.of(2026, 7, 11));
        verify(jdbc).update(eq("UPDATE players SET fitness = LEAST(100, fitness + 12) WHERE career_save_id = ?"), eq(career.getId()));
    }

    @Test
    void nextSeasonCreatesFreshFixturesForCurrentClubs() {
        var careers = mock(CareerSaveRepository.class);
        var fixtures = mock(FixtureRepository.class);
        var matches = mock(SimulatedMatchRepository.class);
        var jdbc = mock(JdbcOperations.class);
        var persistence = new CareerMatchPersistenceService(careers, fixtures, matches, jdbc, new ObjectMapper());
        var service = new CareerGameService(careers, fixtures, matches, persistence,
            new MatchEngineClient("http://unused"), jdbc, new ObjectMapper());
        var career = new CareerSaveEntity(42L, "Season", LocalDate.of(2026, 7, 10));
        career.finishSeason();
        var clubs = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        when(careers.findByIdAndOwnerUserId(career.getId(), 42L)).thenReturn(Optional.of(career));
        when(careers.save(any(CareerSaveEntity.class))).thenAnswer(call -> call.getArgument(0));
        when(jdbc.query(startsWith("SELECT id FROM clubs"), any(org.springframework.jdbc.core.RowMapper.class), eq(career.getId())))
            .thenReturn(clubs);

        var next = service.nextSeason(42L, career.getId());

        var captured = ArgumentCaptor.forClass(FixtureEntity.class);
        verify(fixtures, times(6)).save(captured.capture());
        assertThat(next.getSeasonNumber()).isEqualTo(2);
        assertThat(next.getStatus()).isEqualTo("ACTIVE");
        assertThat(captured.getAllValues()).allSatisfy(fixture -> assertThat(fixture.getSeasonNumber()).isEqualTo(2));
    }
}
