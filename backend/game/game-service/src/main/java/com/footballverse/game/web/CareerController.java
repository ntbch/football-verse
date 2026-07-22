package com.footballverse.game.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.footballverse.game.career.CareerGameService;
import com.footballverse.game.career.CareerTacticsService;
import com.footballverse.game.career.InteractiveMatchService;
import com.footballverse.game.career.TransferMarketService;
import com.footballverse.game.career.ManagerService;
import com.footballverse.game.career.PageResult;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/game/saves")
public class CareerController {
    private final CareerGameService careers;
    private final TransferMarketService transfers;
    private final ManagerService managers;
    private final CareerTacticsService tactics;
    private final InteractiveMatchService matchSessions;

    public CareerController(CareerGameService careers, TransferMarketService transfers, ManagerService managers,
                            CareerTacticsService tactics, InteractiveMatchService matchSessions) {
        this.careers = careers;
        this.transfers = transfers;
        this.managers = managers;
        this.tactics = tactics;
        this.matchSessions = matchSessions;
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

    @PatchMapping("/{saveId}")
    public SaveResponse rename(HttpServletRequest request, @PathVariable UUID saveId,
                               @Valid @RequestBody RenameSaveRequest body) {
        return save(careers.rename(userId(request), saveId, body.name()));
    }

    @DeleteMapping("/{saveId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(HttpServletRequest request, @PathVariable UUID saveId) {
        careers.delete(userId(request), saveId);
    }

    @GetMapping("/{saveId}/fixtures")
    public List<FixtureResponse> fixtures(HttpServletRequest request, @PathVariable UUID saveId) {
        return fixtures(careers.fixtures(userId(request), saveId));
    }

    @PostMapping("/{saveId}/advance-day")
    public SaveResponse advanceDay(HttpServletRequest request, @PathVariable UUID saveId) {
        var owner = userId(request);
        careers.completeDueAiMatchdays(owner, saveId);
        var result = careers.advanceDay(owner, saveId);
        careers.completeDueAiMatchdays(owner, saveId);
        managers.advanceDay(owner, saveId);
        transfers.advanceDay(owner, saveId);
        return save(result);
    }

    @PostMapping("/{saveId}/training-focus")
    public SaveResponse trainingFocus(HttpServletRequest request, @PathVariable UUID saveId,
                                      @RequestBody TrainingFocusRequest body) {
        return save(careers.setTrainingFocus(userId(request), saveId, body.focus()));
    }

    @PostMapping("/{saveId}/next-season")
    public SaveResponse nextSeason(HttpServletRequest request, @PathVariable UUID saveId) {
        return save(careers.nextSeason(userId(request), saveId));
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

    @GetMapping("/{saveId}/manager")
    public ManagerService.Dashboard manager(HttpServletRequest request, @PathVariable UUID saveId) {
        return managers.dashboard(userId(request), saveId);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/manager")
    public ManagerService.Dashboard clubManager(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId) {
        return managers.clubManager(userId(request), saveId, clubId);
    }

    @GetMapping("/{saveId}/manager/decisions")
    public List<java.util.Map<String,Object>> managerDecisions(HttpServletRequest request, @PathVariable UUID saveId) {
        return managers.decisions(userId(request), saveId);
    }

    @GetMapping("/{saveId}/jobs")
    public List<java.util.Map<String,Object>> jobs(HttpServletRequest request, @PathVariable UUID saveId) {
        return managers.jobs(userId(request), saveId);
    }

    @PostMapping("/{saveId}/jobs/{clubId}/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void acceptJob(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId) {
        managers.acceptJob(userId(request), saveId, clubId);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/market")
    public TransferMarketService.TransferMarket market(HttpServletRequest request, @PathVariable UUID saveId,
                                                        @PathVariable UUID clubId) {
        return transfers.market(userId(request), saveId, clubId);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/market/paged")
    public TransferMarketService.MarketPage marketPage(
        HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
        @RequestParam(defaultValue = "") String q
    ) {
        return transfers.marketPage(userId(request), saveId, clubId, page, size, q);
    }

    @PostMapping("/{saveId}/clubs/{clubId}/scouting/{playerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void scout(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId, @PathVariable UUID playerId) {
        transfers.scout(userId(request), saveId, clubId, playerId);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/offers")
    public List<TransferMarketService.Offer> offers(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId) {
        return transfers.offers(userId(request), saveId, clubId);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/offers/paged")
    public PageResult<TransferMarketService.Offer> offersPage(
        HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
        @RequestParam(defaultValue = "") String q
    ) {
        return transfers.offersPage(userId(request), saveId, clubId, page, size, q);
    }

    @PostMapping("/{saveId}/clubs/{clubId}/offers")
    public TransferMarketService.Offer submitOffer(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
                                                    @RequestBody OfferRequest body) {
        return transfers.submit(userId(request), saveId, clubId, body.playerId(), body.fee());
    }

    @PostMapping("/{saveId}/clubs/{clubId}/offers/{offerId}/respond")
    public TransferMarketService.Offer respond(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
                                                @PathVariable UUID offerId, @RequestBody OfferResponse body) {
        return transfers.respond(userId(request), saveId, clubId, offerId, body.action(), body.fee());
    }

    @PostMapping("/{saveId}/clubs/{clubId}/offers/{offerId}/terms")
    public TransferMarketService.Offer terms(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
                                              @PathVariable UUID offerId, @RequestBody TermsRequest body) {
        return transfers.terms(userId(request), saveId, clubId, offerId, body.wage(), body.contractYears(), body.squadRole());
    }

    @PostMapping("/{saveId}/clubs/{clubId}/offers/{offerId}/complete")
    public TransferMarketService.Offer complete(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
                                                 @PathVariable UUID offerId) {
        return transfers.complete(userId(request), saveId, clubId, offerId);
    }

    @PatchMapping("/{saveId}/clubs/{clubId}/players/{playerId}/transfer-status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void transferStatus(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
                               @PathVariable UUID playerId, @RequestBody TransferStatusRequest body) {
        transfers.setStatus(userId(request), saveId, clubId, playerId, body.status());
    }

    @PostMapping("/{saveId}/fixtures/{fixtureId}/play")
    public PlayResponse play(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID fixtureId,
                             @RequestBody(required = false) PlayFixtureRequest body) {
        if (matchSessions.active(userId(request), saveId) != null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Finish the active match session first");
        long seed = body == null || body.seed() == null
            ? ThreadLocalRandom.current().nextLong(Long.MAX_VALUE)
            : body.seed();
        if (seed < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seed must be non-negative");
        }
        var played = careers.play(userId(request), saveId, fixtureId, seed,
            body == null ? null : body.homeLineup(), body == null ? null : body.homeTactic());
        return new PlayResponse(played.matchId(), played.result(), played.matchdayNumber(), played.simulatedAiMatchIds(),
            played.failedFixtureIds(), played.matchdayComplete());
    }

    @PostMapping("/{saveId}/fixtures/{fixtureId}/match-session")
    public InteractiveMatchService.Snapshot startMatchSession(HttpServletRequest request, @PathVariable UUID saveId,
                                                               @PathVariable UUID fixtureId,
                                                               @RequestBody StartMatchSessionRequest body) {
        var seed = body.seed() == null ? ThreadLocalRandom.current().nextLong(Long.MAX_VALUE) : body.seed();
        return matchSessions.start(userId(request), saveId, fixtureId, body.requestId(), seed, body.lineup(), body.tactic());
    }

    @GetMapping("/{saveId}/match-session")
    public ResponseEntity<InteractiveMatchService.Snapshot> activeMatchSession(HttpServletRequest request,
                                                                                @PathVariable UUID saveId) {
        var active = matchSessions.active(userId(request), saveId);
        return active == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(active);
    }

    @GetMapping("/{saveId}/match-sessions/{sessionId}")
    public InteractiveMatchService.Snapshot matchSession(HttpServletRequest request, @PathVariable UUID saveId,
                                                          @PathVariable UUID sessionId) {
        return matchSessions.get(userId(request), saveId, sessionId);
    }

    @PostMapping("/{saveId}/match-sessions/{sessionId}/continue")
    public InteractiveMatchService.Snapshot continueMatchSession(HttpServletRequest request, @PathVariable UUID saveId,
                                                                  @PathVariable UUID sessionId,
                                                                  @RequestBody MatchSessionAction body) {
        return matchSessions.advance(userId(request), saveId, sessionId, body.requestId(), version(body));
    }

    @PostMapping("/{saveId}/match-sessions/{sessionId}/command")
    public InteractiveMatchService.Snapshot commandMatchSession(HttpServletRequest request, @PathVariable UUID saveId,
                                                                 @PathVariable UUID sessionId,
                                                                 @RequestBody MatchSessionCommand body) {
        return matchSessions.command(userId(request), saveId, sessionId, body.requestId(), version(body),
            new InteractiveMatchService.MatchCommand(body.type(), body.tactic(), body.lineup(), body.shout(),
                body.outgoingPlayerId(), body.incomingPlayerId(), body.substitutions()));
    }

    @PostMapping("/{saveId}/match-sessions/{sessionId}/finish")
    public InteractiveMatchService.FinishResult finishMatchSession(HttpServletRequest request, @PathVariable UUID saveId,
                                                                    @PathVariable UUID sessionId,
                                                                    @RequestBody MatchSessionAction body) {
        return matchSessions.finish(userId(request), saveId, sessionId, body.requestId(), version(body));
    }

    @ExceptionHandler(InteractiveMatchService.Conflict.class)
    public ResponseEntity<MatchSessionConflictResponse> matchSessionConflict(InteractiveMatchService.Conflict conflict) {
        InteractiveMatchService.Snapshot latest = null;
        try {
            latest = conflict.sessionId() == null
                ? matchSessions.active(conflict.ownerId(), conflict.careerId())
                : matchSessions.get(conflict.ownerId(), conflict.careerId(), conflict.sessionId());
        } catch (ResponseStatusException ignored) {
            // Never expose a session that is no longer owned or visible.
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new MatchSessionConflictResponse(conflict.getMessage(), latest));
    }

    @PostMapping("/{saveId}/match-sessions/{sessionId}/abandon")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void abandonMatchSession(HttpServletRequest request, @PathVariable UUID saveId,
                                    @PathVariable UUID sessionId, @RequestBody MatchSessionAction body) {
        matchSessions.abandon(userId(request), saveId, sessionId, body.requestId(), version(body));
    }

    @PostMapping("/{saveId}/matchdays/{matchdayNumber}/complete")
    public CareerGameService.MatchdayCompletion completeMatchday(HttpServletRequest request, @PathVariable UUID saveId,
                                                                  @PathVariable int matchdayNumber) {
        return careers.completeMatchday(userId(request), saveId, matchdayNumber);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/squad")
    public List<PlayerSnapshot> squad(HttpServletRequest request, @PathVariable UUID saveId,
                                      @PathVariable UUID clubId) {
        return careers.squad(userId(request), saveId, clubId);
    }

    @GetMapping("/{saveId}/tactics")
    public CareerTacticsService.TacticalSetup tactics(HttpServletRequest request, @PathVariable UUID saveId) {
        return tactics.get(userId(request), saveId);
    }

    @PutMapping("/{saveId}/tactics")
    public CareerTacticsService.TacticalSetup saveTactics(HttpServletRequest request, @PathVariable UUID saveId,
                                                           @RequestBody CareerTacticsService.TacticalSetup setup) {
        return tactics.save(userId(request), saveId, setup);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/analysis")
    public List<CareerTacticsService.PlayerAnalysis> analysis(HttpServletRequest request, @PathVariable UUID saveId,
                                                               @PathVariable UUID clubId) {
        return tactics.analysis(userId(request), saveId, clubId);
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

    private static long version(MatchSessionAction body) {
        if (body.expectedVersion() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expected version is required");
        return body.expectedVersion();
    }

    private static long version(MatchSessionCommand body) {
        if (body.expectedVersion() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expected version is required");
        return body.expectedVersion();
    }

    private static SaveResponse save(CareerSaveEntity save) {
        return new SaveResponse(save.getId(), save.getName(), save.getGameDate(), save.getStatus(),
            save.getSeasonNumber(), save.getTrainingFocus(), save.getManagedClubId(), save.getPlayerManagerId());
    }

    private List<FixtureResponse> fixtures(List<FixtureEntity> fixtures) {
        return fixtures.stream().map(fixture -> new FixtureResponse(
            fixture.getId(), fixture.getHomeClubId(), careers.clubName(fixture.getHomeClubId()),
            fixture.getAwayClubId(), careers.clubName(fixture.getAwayClubId()),
            fixture.getMatchDate(), fixture.getStatus(), fixture.getMatchdayNumber()
        )).toList();
    }

    public record CreateSaveRequest(@NotBlank @Size(max = 100) String name) {}
    public record RenameSaveRequest(@NotBlank @Size(max = 100) String name) {}
    public record TrainingFocusRequest(String focus) {}
    public record OfferRequest(UUID playerId, BigDecimal fee) {}
    public record OfferResponse(String action, BigDecimal fee) {}
    public record TermsRequest(BigDecimal wage, int contractYears, String squadRole) {}
    public record TransferStatusRequest(String status) {}
    public record PlayFixtureRequest(Long seed, Lineup homeLineup, Tactic homeTactic) {}
    public record StartMatchSessionRequest(UUID requestId, Long seed, Lineup lineup, Tactic tactic) {}
    public record MatchSessionAction(UUID requestId, Long expectedVersion) {}
    public record MatchSessionCommand(UUID requestId, Long expectedVersion, String type, Tactic tactic, Lineup lineup,
                                      String shout, UUID outgoingPlayerId, UUID incomingPlayerId,
                                      List<InteractiveMatchService.Substitution> substitutions) {}
    public record MatchSessionConflictResponse(String message, InteractiveMatchService.Snapshot session) {}
    public record SaveResponse(UUID id, String name, LocalDate gameDate, String status, int seasonNumber,
                               String trainingFocus, UUID managedClubId, UUID playerManagerId) {}
    public record FixtureResponse(UUID id, UUID homeClubId, String homeClubName, UUID awayClubId,
                                  String awayClubName, LocalDate matchDate, String status, int matchdayNumber) {}
    public record SaveDetailsResponse(SaveResponse save, List<FixtureResponse> fixtures,
                                      CareerGameService.SeasonSummary seasonSummary,
                                      List<CareerGameService.SeasonRecord> history) {}
    public record PlayResponse(UUID matchId, JsonNode result, int matchdayNumber, List<UUID> simulatedAiMatchIds,
                               List<UUID> failedFixtureIds, boolean matchdayComplete) {}
}
