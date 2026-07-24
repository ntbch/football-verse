package com.footballverse.game.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.footballverse.game.career.CareerGameService;
import com.footballverse.game.career.CareerMutationLedgerService;
import com.footballverse.game.career.InteractiveMatchService;
import com.footballverse.game.career.PageResult;
import com.footballverse.game.security.InternalGatewayFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/game/saves")
public class CareerFixtureController {
    private final CareerGameService careers;
    private final InteractiveMatchService matchSessions;
    private final CareerMutationLedgerService ledger;

    public CareerFixtureController(CareerGameService careers, InteractiveMatchService matchSessions,
                                   CareerMutationLedgerService ledger) {
        this.careers = careers;
        this.matchSessions = matchSessions;
        this.ledger = ledger;
    }

    @GetMapping("/{saveId}/fixtures")
    public List<CareerController.FixtureResponse> fixtures(HttpServletRequest request, @PathVariable UUID saveId) {
        return careers.fixtures(userId(request), saveId).stream().map(fixture -> new CareerController.FixtureResponse(
            fixture.getId(), fixture.getHomeClubId(), careers.clubName(fixture.getHomeClubId()),
            fixture.getAwayClubId(), careers.clubName(fixture.getAwayClubId()),
            fixture.getMatchDate(), fixture.getStatus(), fixture.getMatchdayNumber()
        )).toList();
    }

    @GetMapping("/{saveId}/standings")
    public List<CareerGameService.ClubStanding> standings(HttpServletRequest request, @PathVariable UUID saveId) {
        return careers.standings(userId(request), saveId);
    }

    @GetMapping("/{saveId}/player-stats")
    public List<CareerGameService.PlayerSeasonStats> playerStats(HttpServletRequest request, @PathVariable UUID saveId) {
        return careers.playerStats(userId(request), saveId);
    }

    @GetMapping("/{saveId}/player-stats/paged")
    public PageResult<CareerGameService.PlayerSeasonStats> playerStatsPage(
        HttpServletRequest request, @PathVariable UUID saveId,
        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
        @RequestParam(defaultValue = "") String q
    ) {
        return careers.playerStatsPage(userId(request), saveId, page, size, q);
    }

    @PostMapping("/{saveId}/fixtures/{fixtureId}/play")
    public CareerController.PlayResponse play(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID fixtureId,
                                              @RequestBody(required = false) CareerController.PlayFixtureRequest body,
                                              @RequestHeader(name = "X-Request-ID") UUID requestId) {
        var owner = userId(request);
        return ledger.execute(owner, saveId, requestId, "PLAY_FIXTURE", CareerController.PlayResponse.class, () -> {
            if (matchSessions.active(owner, saveId) != null)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Finish the active match session first");
            long seed = body == null || body.seed() == null
                ? ThreadLocalRandom.current().nextLong(Long.MAX_VALUE)
                : body.seed();
            if (seed < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seed must be non-negative");
            var played = careers.play(owner, saveId, fixtureId, seed,
                body == null ? null : body.homeLineup(), body == null ? null : body.homeTactic());
            return new CareerController.PlayResponse(played.matchId(), played.result(), played.matchdayNumber(),
                played.simulatedAiMatchIds(), played.failedFixtureIds(), played.matchdayComplete());
        });
    }

    @PostMapping("/{saveId}/matchdays/{matchdayNumber}/complete")
    public CareerGameService.MatchdayCompletion completeMatchday(HttpServletRequest request, @PathVariable UUID saveId,
                                                                  @PathVariable int matchdayNumber,
                                                                  @RequestHeader(name = "X-Request-ID") UUID requestId) {
        var owner = userId(request);
        return ledger.execute(owner, saveId, requestId, "COMPLETE_MATCHDAY", CareerGameService.MatchdayCompletion.class,
            () -> careers.completeMatchday(owner, saveId, matchdayNumber));
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
}
