package com.footballverse.game.career;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.dto.MatchInput;
import com.footballverse.game.dto.TeamSnapshot;
import com.footballverse.game.persistence.MatchSessionEntity;
import com.footballverse.game.persistence.MatchSessionRepository;
import com.footballverse.game.persistence.MatchSessionRequestEntity;
import com.footballverse.game.persistence.MatchSessionRequestRepository;
import com.footballverse.game.web.CareerController;
import com.footballverse.game.web.CareerMatchSessionController;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class InteractiveMatchServiceTest {
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void exposesNestedScoresAndOnlyEnablesFinishAtFullTime() throws Exception {
        var careerId = UUID.randomUUID();
        var fixtureId = UUID.randomUUID();
        var homeId = UUID.randomUUID();
        var awayId = UUID.randomUUID();
        var input = new MatchInput(99L, "0.1.0", "1",
            new TeamSnapshot(homeId, "Home", List.of(), null, null),
            new TeamSnapshot(awayId, "Away", List.of(), null, null));
        var state = json.readTree("""
            {"minute":91,"completed":true,"events":[],
             "home":{"goals":2,"possessions":6,"shots":3},
             "away":{"goals":1,"possessions":4,"shots":2},
             "rng_state":12345}
            """);
        var session = new MatchSessionEntity(careerId, fixtureId, 7L, UUID.randomUUID(),
            json.writeValueAsString(input), json.writeValueAsString(state));

        var snapshot = InteractiveMatchService.toSnapshot(session, input, homeId, state);

        assertThat(snapshot.minute()).isEqualTo(90);
        assertThat(snapshot.score()).isEqualTo(new InteractiveMatchService.Score(2, 1));
        assertThat(snapshot.canContinue()).isFalse();
        assertThat(snapshot.canFinish()).isTrue();
        assertThat(snapshot.pauseReason()).isEqualTo("FULL_TIME");
        assertThat(snapshot.substitutions().playersRemaining()).isEqualTo(5);
        assertThat(snapshot.substitutions().windowsRemaining()).isEqualTo(3);
        assertThat(json.valueToTree(snapshot).has("rng_state")).isFalse();
    }

    @Test
    void replaysTheOriginalStoredResponseWithoutCallingTheEngine() throws Exception {
        var ownerId = 7L;
        var careerId = UUID.randomUUID();
        var fixtureId = UUID.randomUUID();
        var sessionId = UUID.randomUUID();
        var requestId = UUID.randomUUID();
        var expected = new InteractiveMatchService.Snapshot(sessionId, fixtureId, null, 20,
            new InteractiveMatchService.Score(1, 0), "ACTIVE", 2, "MILESTONE", UUID.randomUUID(),
            null, null, json.createArrayNode(), null,
            new InteractiveMatchService.SubstitutionQuota(1, 4, 1, 2, false), true, false);
        var sessions = mock(MatchSessionRepository.class);
        var requests = mock(MatchSessionRequestRepository.class);
        when(requests.findByRequestIdAndOwnerUserId(requestId, ownerId)).thenReturn(Optional.of(
            new MatchSessionRequestEntity(requestId, sessionId, careerId, ownerId, "CONTINUE",
                json.writeValueAsString(expected))));
        var service = new InteractiveMatchService(sessions, requests, null, null, json);

        var replayed = service.advance(ownerId, careerId, sessionId, requestId, 0);

        assertThat(replayed).isEqualTo(expected);
        verifyNoInteractions(sessions);
    }

    @Test
    void rejectsAnOversizedEngineEventSnapshot() throws Exception {
        var state = json.createObjectNode().put("minute", 1);
        var events = state.putArray("events");
        for (var index = 0; index <= 2_000; index++) events.addObject().put("sequence", index);

        assertThatThrownBy(() -> InteractiveMatchService.validateState(state))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("too many events");
    }

    @Test
    void conflictResponseContainsOnlyTheLatestAuthorizedSnapshot() {
        var ownerId = 7L;
        var careerId = UUID.randomUUID();
        var sessionId = UUID.randomUUID();
        var expected = new InteractiveMatchService.Snapshot(sessionId, UUID.randomUUID(), null, 30,
            new InteractiveMatchService.Score(0, 0), "ACTIVE", 3, "MILESTONE", UUID.randomUUID(),
            null, null, json.createArrayNode(), null,
            new InteractiveMatchService.SubstitutionQuota(0, 5, 0, 3, false), true, false);
        var service = new InteractiveMatchService(null, null, null, null, json) {
            @Override public Snapshot get(Long owner, UUID career, UUID session) {
                return owner.equals(ownerId) && career.equals(careerId) && session.equals(sessionId) ? expected : null;
            }
        };
        var controller = new CareerMatchSessionController(service);

        var response = controller.matchSessionConflict(
            new InteractiveMatchService.Conflict(ownerId, careerId, sessionId, "Match session changed"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().message()).isEqualTo("Match session changed");
        assertThat(response.getBody().session()).isEqualTo(expected);
    }
}
