package com.footballverse.game.career;

import com.footballverse.game.persistence.CareerSaveEntity;
import com.footballverse.game.persistence.CareerSaveRepository;
import com.footballverse.game.persistence.FixtureEntity;
import com.footballverse.game.persistence.FixtureRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class CareerSaveLifecycleService {
    private static final com.footballverse.game.dto.Position[] SQUAD_POSITIONS = {
        com.footballverse.game.dto.Position.GK, com.footballverse.game.dto.Position.GK,
        com.footballverse.game.dto.Position.LB, com.footballverse.game.dto.Position.CB, com.footballverse.game.dto.Position.CB, com.footballverse.game.dto.Position.CB, com.footballverse.game.dto.Position.RB,
        com.footballverse.game.dto.Position.CM, com.footballverse.game.dto.Position.CM, com.footballverse.game.dto.Position.CM, com.footballverse.game.dto.Position.DM, com.footballverse.game.dto.Position.AM,
        com.footballverse.game.dto.Position.LW, com.footballverse.game.dto.Position.RW, com.footballverse.game.dto.Position.LM, com.footballverse.game.dto.Position.RM,
        com.footballverse.game.dto.Position.ST, com.footballverse.game.dto.Position.ST
    };
    private static final String[] FIRST_NAMES = {
        "Mateo", "Lucas", "Noah", "Ethan", "Liam", "Milan", "Theo", "Nico", "Leo",
        "Rafael", "Jonas", "Adrian", "Kai", "Owen", "Felix", "Ibrahim", "Marco", "Dario"
    };
    private static final String[] LAST_NAMES = {
        "Silva", "Moreau", "Reed", "Kovac", "Bennett", "Santos", "Novak", "Hayes", "Costa",
        "Mercer", "Larsen", "Diallo", "Rossi", "Ward", "Fischer", "Almeida", "Stone", "Marin"
    };

    private final CareerSaveRepository careers;
    private final FixtureRepository fixtures;
    private final JdbcOperations jdbc;
    private final ManagerService managers;
    private final com.fasterxml.jackson.databind.ObjectMapper json;

    public CareerSaveLifecycleService(CareerSaveRepository careers, FixtureRepository fixtures,
                                     JdbcOperations jdbc, ManagerService managers,
                                     com.fasterxml.jackson.databind.ObjectMapper json) {
        this.careers = careers;
        this.fixtures = fixtures;
        this.jdbc = jdbc;
        this.managers = managers;
        this.json = json;
    }

    @Transactional
    public CareerSaveEntity create(Long ownerUserId, String name) {
        var career = careers.saveAndFlush(new CareerSaveEntity(ownerUserId, name, LocalDate.now()));
        var clubs = List.of(
            seedClub(career.getId(), "Aurora FC", 64, "TIKI_TAKA"),
            seedClub(career.getId(), "Riverside United", 61, "COUNTER_ATTACK"),
            seedClub(career.getId(), "Northbridge City", 62, "GEGENPRESS"),
            seedClub(career.getId(), "Harbor Athletic", 60, "PARK_THE_BUS"),
            seedClub(career.getId(), "Kingsport Rovers", 59, "DIRECT_LONG_BALL"),
            seedClub(career.getId(), "Meadow Park", 58, "WING_PLAY"),
            seedClub(career.getId(), "Stonehaven FC", 63, "BALANCED"),
            seedClub(career.getId(), "Westford Town", 57, "TIKI_TAKA")
        );
        career.setManagedClubId(clubs.getFirst());
        if (managers != null) career.setPlayerManagerId(managers.seed(career, clubs));
        careers.save(career);
        seedFixtures(career.getId(), career.getSeasonNumber(), career.getGameDate().plusDays(1), clubs);
        return career;
    }

    public List<CareerSaveEntity> list(Long ownerUserId) {
        return careers.findAllByOwnerUserIdOrderByCreatedAtDesc(ownerUserId);
    }

    public CareerSaveEntity get(Long ownerUserId, UUID careerId) {
        return careers.findByIdAndOwnerUserId(careerId, ownerUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Career resource not found"));
    }

    @Transactional
    public CareerSaveEntity rename(Long ownerUserId, UUID careerId, String name) {
        var value = name == null ? "" : name.trim();
        if (value.isEmpty() || value.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Career name is required");
        }
        var career = get(ownerUserId, careerId);
        career.setName(value);
        return careers.save(career);
    }

    @Transactional
    public void delete(Long ownerUserId, UUID careerId) {
        careers.delete(get(ownerUserId, careerId));
    }

    @Transactional
    public CareerSaveEntity setTrainingFocus(Long ownerUserId, UUID careerId, String focus) {
        var value = focus == null ? "" : focus.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("BALANCED", "FITNESS", "ATTACK", "DEFENSE", "MORALE").contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported training focus");
        }
        var career = get(ownerUserId, careerId);
        career.setTrainingFocus(value);
        return careers.save(career);
    }

    private UUID seedClub(UUID careerId, String name, int rating, String preferredTactic) {
        var clubId = UUID.randomUUID();
        jdbc.update("INSERT INTO clubs (id, career_save_id, name, reputation, preferred_tactic) VALUES (?, ?, ?, ?, ?)",
            clubId, careerId, name, rating, preferredTactic);
        for (int index = 0; index < SQUAD_POSITIONS.length; index++) {
            var position = SQUAD_POSITIONS[index];
            var attributes = attributesFor(position, rating + ((index % 5) - 2));
            jdbc.update("""
                INSERT INTO players (id, career_save_id, club_id, name, primary_position, secondary_positions, attributes, contract_until)
                VALUES (?, ?, ?, ?, ?, CAST(? AS text[]), CAST(? AS jsonb), (SELECT game_date + 730 FROM career_saves WHERE id = ?))
                """, UUID.randomUUID(), careerId, clubId, playerName(name, index),
                position.name(), pgArray(secondaryPositions(position)), write(attributes), careerId);
        }
        return clubId;
    }

    private static String playerName(String clubName, int index) {
        var offset = Math.abs(clubName.hashCode());
        return FIRST_NAMES[(index + offset) % FIRST_NAMES.length] + " "
            + LAST_NAMES[(index * 3 + offset) % LAST_NAMES.length];
    }

    private void seedFixtures(UUID careerId, int seasonNumber, LocalDate startDate, List<UUID> clubs) {
        for (var pairing : CareerGameService.schedule(clubs)) {
            fixtures.save(new FixtureEntity(careerId, pairing.home(), pairing.away(),
                startDate.plusWeeks(pairing.matchday() - 1L), seasonNumber, pairing.matchday()));
        }
    }

    private static Set<com.footballverse.game.dto.Position> secondaryPositions(com.footballverse.game.dto.Position position) {
        return switch (position) {
            case LB -> Set.of(com.footballverse.game.dto.Position.LWB);
            case RB -> Set.of(com.footballverse.game.dto.Position.RWB);
            case LWB -> Set.of(com.footballverse.game.dto.Position.LB, com.footballverse.game.dto.Position.LM);
            case RWB -> Set.of(com.footballverse.game.dto.Position.RB, com.footballverse.game.dto.Position.RM);
            case DM -> Set.of(com.footballverse.game.dto.Position.CM);
            case CM -> Set.of(com.footballverse.game.dto.Position.DM, com.footballverse.game.dto.Position.AM);
            case AM -> Set.of(com.footballverse.game.dto.Position.CM);
            case LM -> Set.of(com.footballverse.game.dto.Position.LW);
            case RM -> Set.of(com.footballverse.game.dto.Position.RW);
            case LW -> Set.of(com.footballverse.game.dto.Position.LM, com.footballverse.game.dto.Position.ST);
            case RW -> Set.of(com.footballverse.game.dto.Position.RM, com.footballverse.game.dto.Position.ST);
            default -> Set.of();
        };
    }

    private static String pgArray(Set<com.footballverse.game.dto.Position> positions) {
        return "{" + positions.stream().map(com.footballverse.game.dto.Position::name).sorted().collect(java.util.stream.Collectors.joining(",")) + "}";
    }

    private com.footballverse.game.dto.PlayerAttributes attributesFor(com.footballverse.game.dto.Position position, int rating) {
        var r = Math.max(1, Math.min(100, rating));
        return switch (position) {
            case GK -> new com.footballverse.game.dto.PlayerAttributes(r - 8, r - 8, r - 8, r - 6, r - 15, r, r, r, r + 2, r, r,
                r, r - 8, r, r + 10, r + 10, r + 10, r + 8);
            case CB, LB, RB, LWB, RWB -> new com.footballverse.game.dto.PlayerAttributes(r, r, r - 2, r + 8, r - 8, r, r + 5, r + 5,
                r + 5, r, r + 8, r, r + 4, r, r - 20, r - 20, r - 20, r - 10);
            case DM, CM, AM, LM, RM -> new com.footballverse.game.dto.PlayerAttributes(r + 6, r + 5, r + 4, r, r, r, r, r + 4, r - 2,
                r + 6, r + 4, r + 4, r, r + 5, r - 20, r - 20, r - 20, r - 10);
            default -> new com.footballverse.game.dto.PlayerAttributes(r, r + 4, r + 5, r - 6, r + 8, r + 4, r, r, r,
                r, r, r + 6, r, r, r - 20, r - 20, r - 20, r - 10);
        };
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new IllegalStateException("Career seed cannot be serialized", exception);
        }
    }
}
