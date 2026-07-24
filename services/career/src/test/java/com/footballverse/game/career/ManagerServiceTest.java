package com.footballverse.game.career;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.dto.*;
import com.footballverse.game.persistence.CareerSaveRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcOperations;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ManagerServiceTest {
    @Test
    void lineupPolicyIsDeterministicAndValid() {
        var jdbc = mock(JdbcOperations.class);
        var managerId = UUID.randomUUID(); var careerId = UUID.randomUUID(); var clubId = UUID.randomUUID();
        when(jdbc.queryForMap(startsWith("SELECT m.*"), eq(clubId))).thenReturn(new HashMap<>(Map.of(
            "id", managerId, "career_save_id", careerId, "game_date", LocalDate.of(2026, 7, 11),
            "rotation", 70, "youth", 65)));
        var service = new ManagerService(jdbc, mock(CareerSaveRepository.class), new ObjectMapper());
        var positions = List.of(Position.GK, Position.LB, Position.CB, Position.CB, Position.RB,
            Position.CM, Position.CM, Position.CM, Position.LW, Position.RW, Position.ST,
            Position.GK, Position.CB, Position.CM, Position.ST);
        var players = positions.stream().map(position -> player(position)).toList();

        var first = service.lineup(clubId, players);
        var second = service.lineup(clubId, players);

        assertThat(first).isEqualTo(second);
        assertThat(first.starters()).hasSize(11);
        assertThat(first.starters().stream().map(LineupSlot::playerId)).doesNotHaveDuplicates();
        assertThat(first.starters().stream().map(LineupSlot::position)).containsExactlyElementsOf(
            List.of(Position.GK, Position.LB, Position.CB, Position.CB, Position.RB,
                Position.CM, Position.CM, Position.CM, Position.LW, Position.RW, Position.ST));
    }

    private static PlayerSnapshot player(Position position) {
        var attributes = new PlayerAttributes(60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60);
        return new PlayerSnapshot(UUID.randomUUID(), position + " Player", position, Set.of(), attributes, 22,
            PlayerAvailability.AVAILABLE, 90, 55, 55);
    }
}
