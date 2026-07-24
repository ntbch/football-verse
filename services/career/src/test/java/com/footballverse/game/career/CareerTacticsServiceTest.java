package com.footballverse.game.career;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.dto.*;
import com.footballverse.game.persistence.CareerSaveEntity;
import com.footballverse.game.persistence.CareerSaveRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CareerTacticsServiceTest {
    @Test void rejectsDutyThatRoleCannotPerform() {
        var careers = mock(CareerSaveRepository.class);
        var career = new CareerSaveEntity(7L, "Test", LocalDate.now());
        career.setManagedClubId(UUID.randomUUID());
        when(careers.findByIdAndOwnerUserId(career.getId(), 7L)).thenReturn(Optional.of(career));
        var service = new CareerTacticsService(mock(JdbcOperations.class), careers, new ObjectMapper());
        var ids = java.util.stream.Stream.generate(UUID::randomUUID).limit(11).toList();
        var slots = List.of(
            slot(ids, 0, Position.GK, PlayerRole.GOALKEEPER, Duty.DEFEND),
            slot(ids, 1, Position.LB, PlayerRole.FULL_BACK, Duty.SUPPORT),
            slot(ids, 2, Position.CB, PlayerRole.CENTRAL_DEFENDER, Duty.DEFEND),
            slot(ids, 3, Position.CB, PlayerRole.CENTRAL_DEFENDER, Duty.DEFEND),
            slot(ids, 4, Position.RB, PlayerRole.FULL_BACK, Duty.SUPPORT),
            slot(ids, 5, Position.CM, PlayerRole.CENTRAL_MIDFIELDER, Duty.SUPPORT),
            slot(ids, 6, Position.CM, PlayerRole.CENTRAL_MIDFIELDER, Duty.SUPPORT),
            slot(ids, 7, Position.CM, PlayerRole.CENTRAL_MIDFIELDER, Duty.SUPPORT),
            slot(ids, 8, Position.LW, PlayerRole.WINGER, Duty.ATTACK),
            slot(ids, 9, Position.RW, PlayerRole.WINGER, Duty.ATTACK),
            slot(ids, 10, Position.ST, PlayerRole.POACHER, Duty.SUPPORT));
        var setup = new CareerTacticsService.TacticalSetup(
            new Lineup(Formation.FOUR_THREE_THREE, slots, List.of()), TacticPresets.get("BALANCED"));

        var error = assertThrows(ResponseStatusException.class, () -> service.save(7L, career.getId(), setup));
        assertEquals(400, error.getStatusCode().value());
    }

    private static LineupSlot slot(List<UUID> ids, int index, Position position, PlayerRole role, Duty duty) {
        return new LineupSlot(ids.get(index), position, role, duty);
    }
}
