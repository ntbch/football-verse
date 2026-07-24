package com.footballverse.game.web;

import com.footballverse.game.career.InteractiveMatchService;
import com.footballverse.game.security.InternalGatewayFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/game/saves")
public class CareerMatchSessionController {
    private final InteractiveMatchService matchSessions;

    public CareerMatchSessionController(InteractiveMatchService matchSessions) {
        this.matchSessions = matchSessions;
    }

    @PostMapping("/{saveId}/fixtures/{fixtureId}/match-session")
    public InteractiveMatchService.Snapshot startMatchSession(HttpServletRequest request, @PathVariable UUID saveId,
                                                               @PathVariable UUID fixtureId,
                                                               @RequestBody CareerController.StartMatchSessionRequest body) {
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
                                                                  @RequestBody CareerController.MatchSessionAction body) {
        return matchSessions.advance(userId(request), saveId, sessionId, body.requestId(), version(body));
    }

    @PostMapping("/{saveId}/match-sessions/{sessionId}/command")
    public InteractiveMatchService.Snapshot commandMatchSession(HttpServletRequest request, @PathVariable UUID saveId,
                                                                 @PathVariable UUID sessionId,
                                                                 @RequestBody CareerController.MatchSessionCommand body) {
        return matchSessions.command(userId(request), saveId, sessionId, body.requestId(), version(body),
            new InteractiveMatchService.MatchCommand(body.type(), body.tactic(), body.lineup(), body.shout(),
                body.outgoingPlayerId(), body.incomingPlayerId(), body.substitutions()));
    }

    @PostMapping("/{saveId}/match-sessions/{sessionId}/finish")
    public InteractiveMatchService.FinishResult finishMatchSession(HttpServletRequest request, @PathVariable UUID saveId,
                                                                    @PathVariable UUID sessionId,
                                                                    @RequestBody CareerController.MatchSessionAction body) {
        return matchSessions.finish(userId(request), saveId, sessionId, body.requestId(), version(body));
    }

    @ExceptionHandler(InteractiveMatchService.Conflict.class)
    public ResponseEntity<CareerController.MatchSessionConflictResponse> matchSessionConflict(InteractiveMatchService.Conflict conflict) {
        InteractiveMatchService.Snapshot latest = null;
        try {
            latest = conflict.sessionId() == null
                ? matchSessions.active(conflict.ownerId(), conflict.careerId())
                : matchSessions.get(conflict.ownerId(), conflict.careerId(), conflict.sessionId());
        } catch (ResponseStatusException ignored) {
            // Never expose a session that is no longer owned or visible.
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new CareerController.MatchSessionConflictResponse(conflict.getMessage(), latest));
    }

    @PostMapping("/{saveId}/match-sessions/{sessionId}/abandon")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void abandonMatchSession(HttpServletRequest request, @PathVariable UUID saveId,
                                    @PathVariable UUID sessionId, @RequestBody CareerController.MatchSessionAction body) {
        matchSessions.abandon(userId(request), saveId, sessionId, body.requestId(), version(body));
    }

    private static long userId(HttpServletRequest request) {
        return (Long) request.getAttribute(InternalGatewayFilter.USER_ID_ATTRIBUTE);
    }

    private static long version(CareerController.MatchSessionAction body) {
        if (body.expectedVersion() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expected version is required");
        return body.expectedVersion();
    }

    private static long version(CareerController.MatchSessionCommand body) {
        if (body.expectedVersion() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expected version is required");
        return body.expectedVersion();
    }
}
