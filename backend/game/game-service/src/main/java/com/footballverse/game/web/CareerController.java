package com.footballverse.game.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.footballverse.game.career.CareerGameService;
import com.footballverse.game.dto.Lineup;
import com.footballverse.game.dto.PlayerSnapshot;
import com.footballverse.game.dto.Tactic;
import com.footballverse.game.persistence.CareerSaveEntity;
import com.footballverse.game.persistence.FixtureEntity;
import com.footballverse.game.security.InternalGatewayFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/game/saves")
public class CareerController {
    private final CareerGameService careers;

    public CareerController(CareerGameService careers) {
        this.careers = careers;
    }

    @PostMapping
    public SaveResponse create(HttpServletRequest request, @Valid @RequestBody CreateSaveRequest body) {
        return save(careers.create(userId(request), body.name()));
    }

    @GetMapping
    public List<SaveResponse> list(HttpServletRequest request) {
        return careers.list(userId(request)).stream().map(CareerController::save).toList();
    }

    @GetMapping("/{saveId}")
    public SaveDetailsResponse get(HttpServletRequest request, @PathVariable UUID saveId) {
        var owner = userId(request);
        return new SaveDetailsResponse(save(careers.get(owner, saveId)), fixtures(careers.fixtures(owner, saveId)),
            careers.seasonSummary(owner, saveId), careers.history(owner, saveId));
    }

    @GetMapping("/{saveId}/fixtures")
    public List<FixtureResponse> fixtures(HttpServletRequest request, @PathVariable UUID saveId) {
        return fixtures(careers.fixtures(userId(request), saveId));
    }

    @PostMapping("/{saveId}/advance-day")
    public SaveResponse advanceDay(HttpServletRequest request, @PathVariable UUID saveId) {
        return save(careers.advanceDay(userId(request), saveId));
    }

    @PostMapping("/{saveId}/next-season")
    public SaveResponse nextSeason(HttpServletRequest request, @PathVariable UUID saveId) {
        return save(careers.nextSeason(userId(request), saveId));
    }

    @GetMapping("/{saveId}/standings")
    public List<CareerGameService.ClubStanding> standings(HttpServletRequest request, @PathVariable UUID saveId) {
        return careers.standings(userId(request), saveId);
    }

    @PostMapping("/{saveId}/fixtures/{fixtureId}/play")
    public PlayResponse play(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID fixtureId,
                             @RequestBody(required = false) PlayFixtureRequest body) {
        long seed = body == null || body.seed() == null
            ? ThreadLocalRandom.current().nextLong(Long.MAX_VALUE)
            : body.seed();
        if (seed < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seed must be non-negative");
        }
        var played = careers.play(userId(request), saveId, fixtureId, seed,
            body == null ? null : body.homeLineup(), body == null ? null : body.homeTactic());
        return new PlayResponse(played.matchId(), played.result());
    }

    @GetMapping("/{saveId}/clubs/{clubId}/squad")
    public List<PlayerSnapshot> squad(HttpServletRequest request, @PathVariable UUID saveId,
                                      @PathVariable UUID clubId) {
        return careers.squad(userId(request), saveId, clubId);
    }

    @GetMapping("/{saveId}/matches/{matchId}")
    public JsonNode match(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID matchId) {
        return careers.match(userId(request), saveId, matchId);
    }

    @GetMapping("/{saveId}/matches/{matchId}/events")
    public JsonNode events(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID matchId) {
        return careers.events(userId(request), saveId, matchId);
    }

    private static long userId(HttpServletRequest request) {
        return (Long) request.getAttribute(InternalGatewayFilter.USER_ID_ATTRIBUTE);
    }

    private static SaveResponse save(CareerSaveEntity save) {
        return new SaveResponse(save.getId(), save.getName(), save.getGameDate(), save.getStatus(), save.getSeasonNumber());
    }

    private List<FixtureResponse> fixtures(List<FixtureEntity> fixtures) {
        return fixtures.stream().map(fixture -> new FixtureResponse(
            fixture.getId(), fixture.getHomeClubId(), careers.clubName(fixture.getHomeClubId()),
            fixture.getAwayClubId(), careers.clubName(fixture.getAwayClubId()),
            fixture.getMatchDate(), fixture.getStatus()
        )).toList();
    }

    public record CreateSaveRequest(@NotBlank @Size(max = 100) String name) {}
    public record PlayFixtureRequest(Long seed, Lineup homeLineup, Tactic homeTactic) {}
    public record SaveResponse(UUID id, String name, LocalDate gameDate, String status, int seasonNumber) {}
    public record FixtureResponse(UUID id, UUID homeClubId, String homeClubName, UUID awayClubId,
                                  String awayClubName, LocalDate matchDate, String status) {}
    public record SaveDetailsResponse(SaveResponse save, List<FixtureResponse> fixtures,
                                      CareerGameService.SeasonSummary seasonSummary,
                                      List<CareerGameService.SeasonRecord> history) {}
    public record PlayResponse(UUID matchId, JsonNode result) {}
}
