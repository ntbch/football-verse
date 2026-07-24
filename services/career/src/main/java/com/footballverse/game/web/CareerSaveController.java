package com.footballverse.game.web;

import com.footballverse.game.career.CareerGameService;
import com.footballverse.game.career.CareerMutationLedgerService;
import com.footballverse.game.career.ManagerService;
import com.footballverse.game.career.TransferMarketService;
import com.footballverse.game.security.InternalGatewayFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/game/saves")
public class CareerSaveController {
    private final CareerGameService careers;
    private final ManagerService managers;
    private final TransferMarketService transfers;
    private final CareerMutationLedgerService ledger;

    public CareerSaveController(CareerGameService careers, ManagerService managers, TransferMarketService transfers,
                                CareerMutationLedgerService ledger) {
        this.careers = careers;
        this.managers = managers;
        this.transfers = transfers;
        this.ledger = ledger;
    }

    @PostMapping
    public CareerController.SaveResponse create(HttpServletRequest request, @Valid @RequestBody CreateSaveRequest body) {
        return save(careers.create(userId(request), body.name()));
    }

    @GetMapping
    public List<CareerController.SaveResponse> list(HttpServletRequest request) {
        return careers.list(userId(request)).stream().map(CareerSaveController::save).toList();
    }

    @GetMapping("/{saveId}")
    public CareerController.SaveDetailsResponse get(HttpServletRequest request, @PathVariable UUID saveId) {
        var owner = userId(request);
        var saveEntity = careers.get(owner, saveId);
        var fixturesList = careers.fixtures(owner, saveId).stream().map(fixture -> new CareerController.FixtureResponse(
            fixture.getId(), fixture.getHomeClubId(), careers.clubName(fixture.getHomeClubId()),
            fixture.getAwayClubId(), careers.clubName(fixture.getAwayClubId()),
            fixture.getMatchDate(), fixture.getStatus(), fixture.getMatchdayNumber()
        )).toList();
        return new CareerController.SaveDetailsResponse(save(saveEntity), fixturesList,
            careers.seasonSummary(owner, saveId), careers.history(owner, saveId));
    }

    @PatchMapping("/{saveId}")
    public CareerController.SaveResponse rename(HttpServletRequest request, @PathVariable UUID saveId,
                                                @Valid @RequestBody RenameSaveRequest body) {
        return save(careers.rename(userId(request), saveId, body.name()));
    }

    @DeleteMapping("/{saveId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(HttpServletRequest request, @PathVariable UUID saveId) {
        careers.delete(userId(request), saveId);
    }

    @PostMapping("/{saveId}/advance-day")
    public CareerController.SaveResponse advanceDay(HttpServletRequest request, @PathVariable UUID saveId,
                                                    @RequestHeader(name = "X-Request-ID") UUID requestId) {
        var owner = userId(request);
        return ledger.execute(owner, saveId, requestId, "ADVANCE_DAY", CareerController.SaveResponse.class, () -> {
            careers.completeDueAiMatchdays(owner, saveId);
            var result = careers.advanceDay(owner, saveId);
            careers.completeDueAiMatchdays(owner, saveId);
            managers.advanceDay(owner, saveId);
            transfers.advanceDay(owner, saveId);
            return save(result);
        });
    }

    @PostMapping("/{saveId}/training-focus")
    public CareerController.SaveResponse trainingFocus(HttpServletRequest request, @PathVariable UUID saveId,
                                                       @RequestBody TrainingFocusRequest body) {
        return save(careers.setTrainingFocus(userId(request), saveId, body.focus()));
    }

    @PostMapping("/{saveId}/next-season")
    public CareerController.SaveResponse nextSeason(HttpServletRequest request, @PathVariable UUID saveId,
                                                    @RequestHeader(name = "X-Request-ID") UUID requestId) {
        var owner = userId(request);
        return ledger.execute(owner, saveId, requestId, "NEXT_SEASON", CareerController.SaveResponse.class,
            () -> save(careers.nextSeason(owner, saveId)));
    }

    @GetMapping("/{saveId}/operations/{requestId}")
    public CareerMutationLedgerService.OperationStatus operationStatus(
        HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID requestId
    ) {
        return ledger.status(userId(request), saveId, requestId);
    }

    private static long userId(HttpServletRequest request) {
        return (Long) request.getAttribute(InternalGatewayFilter.USER_ID_ATTRIBUTE);
    }

    private static CareerController.SaveResponse save(com.footballverse.game.persistence.CareerSaveEntity save) {
        return new CareerController.SaveResponse(save.getId(), save.getName(), save.getGameDate(), save.getStatus(),
            save.getSeasonNumber(), save.getTrainingFocus(), save.getManagedClubId(), save.getPlayerManagerId());
    }

    public record CreateSaveRequest(@NotBlank @Size(max = 100) String name) {}
    public record RenameSaveRequest(@NotBlank @Size(max = 100) String name) {}
    public record TrainingFocusRequest(String focus) {}
}
