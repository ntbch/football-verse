package com.footballverse.game.career;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.footballverse.game.dto.Lineup;
import com.footballverse.game.dto.MatchInput;
import com.footballverse.game.dto.TeamSnapshot;
import com.footballverse.game.dto.Tactic;
import com.footballverse.game.engine.MatchEngineClient;
import com.footballverse.game.persistence.MatchSessionEntity;
import com.footballverse.game.persistence.MatchSessionRepository;
import com.footballverse.game.persistence.MatchSessionRequestEntity;
import com.footballverse.game.persistence.MatchSessionRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.List;
import java.util.LinkedHashSet;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class InteractiveMatchService {
    private static final int ADVANCE_MINUTES = 10;
    private static final int MAX_INPUT_BYTES = 256 * 1024;
    private static final int MAX_COMMAND_BYTES = 64 * 1024;
    private static final int MAX_STATE_BYTES = 512 * 1024;
    private static final int MAX_EVENTS = 2_000;
    private static final Logger LOG = LoggerFactory.getLogger(InteractiveMatchService.class);

    private final MatchSessionRepository sessions;
    private final MatchSessionRequestRepository requests;
    private final CareerGameService careers;
    private final MatchEngineClient engine;
    private final ObjectMapper json;

    public InteractiveMatchService(MatchSessionRepository sessions, MatchSessionRequestRepository requests,
                                   CareerGameService careers,
                                   MatchEngineClient engine, ObjectMapper json) {
        this.sessions = sessions;
        this.requests = requests;
        this.careers = careers;
        this.engine = engine;
        this.json = json;
    }

    @Transactional
    public Snapshot start(Long ownerId, UUID careerId, UUID fixtureId, UUID requestId, long seed,
                          Lineup lineup, Tactic tactic) {
        requireRequest(requestId);
        if (seed < 0) throw badRequest("Seed must be non-negative");
        requireSize(write(new StartPayload(seed, lineup, tactic)), MAX_INPUT_BYTES, "Start request");
        lockRequest(requestId);
        var replay = replay(ownerId, careerId, null, requestId, "START", Snapshot.class);
        if (replay != null) return replay;
        var repeated = sessions.findByOwnerUserIdAndRequestId(ownerId, requestId);
        if (repeated.isPresent()) {
            if (!repeated.get().getCareerSaveId().equals(careerId))
                throw conflict(ownerId, careerId, null, "Request ID is already used");
            return snapshot(repeated.get());
        }

        var prepared = careers.prepareInteractive(ownerId, careerId, fixtureId, seed, lineup, tactic);
        var state = engine.startSession(prepared.input());
        validateState(state);
        try {
            var inputSnapshot = write(prepared.input());
            requireSize(inputSnapshot, MAX_INPUT_BYTES, "Match input");
            var session = sessions.saveAndFlush(new MatchSessionEntity(careerId, fixtureId, ownerId, requestId,
                inputSnapshot, write(state)));
            var response = snapshot(session);
            remember(session, requestId, "START", response);
            return response;
        } catch (DataIntegrityViolationException exception) {
            throw conflict(ownerId, careerId, null, "This career already has an active match session");
        }
    }

    public Snapshot active(Long ownerId, UUID careerId) {
        careers.get(ownerId, careerId);
        return sessions.findByCareerSaveIdAndOwnerUserIdAndStatus(careerId, ownerId, "ACTIVE")
            .map(this::snapshot).orElse(null);
    }

    public Snapshot get(Long ownerId, UUID careerId, UUID sessionId) {
        careers.get(ownerId, careerId);
        return snapshot(owned(ownerId, careerId, sessionId));
    }

    @Transactional
    public Snapshot advance(Long ownerId, UUID careerId, UUID sessionId, UUID requestId, long expectedVersion) {
        requireRequest(requestId);
        lockRequest(requestId);
        var replay = replay(ownerId, careerId, sessionId, requestId, "CONTINUE", Snapshot.class);
        if (replay != null) return replay;
        var session = owned(ownerId, careerId, sessionId);
        requireVersion(ownerId, careerId, session, expectedVersion);
        var input = read(session.getInputSnapshot(), MatchInput.class);
        var current = state(session);
        var minute = minute(current);
        if (completed(current)) throw conflict(ownerId, careerId, sessionId, "Match is ready to finish");
        var advanced = engine.advanceSession(input, current, Math.min(90, minute + ADVANCE_MINUTES));
        validateState(advanced);
        session.advance(requestId, write(advanced));
        var response = save(session);
        remember(session, requestId, "CONTINUE", response);
        return response;
    }

    @Transactional
    public Snapshot command(Long ownerId, UUID careerId, UUID sessionId, UUID requestId, long expectedVersion,
                            MatchCommand command) {
        requireRequest(requestId);
        if (command == null || command.type() == null) throw badRequest("Command type is required");
        requireSize(write(command), MAX_COMMAND_BYTES, "Match command");
        lockRequest(requestId);
        var replay = replay(ownerId, careerId, sessionId, requestId, "COMMAND", Snapshot.class);
        if (replay != null) return replay;
        var session = owned(ownerId, careerId, sessionId);
        requireVersion(ownerId, careerId, session, expectedVersion);
        var input = read(session.getInputSnapshot(), MatchInput.class);
        var controlledClubId = careers.get(ownerId, careerId).getManagedClubId();
        validateCommand(command);
        var current = state(session);
        JsonNode changed;
        if ("SUBSTITUTION".equals(command.type())) {
            var changes = command.substitutions() == null || command.substitutions().isEmpty()
                ? List.of(new Substitution(command.outgoingPlayerId(), command.incomingPlayerId()))
                : command.substitutions();
            var quota = substitutionQuota(current, controlledClubId);
            if (changes.size() > quota.playersRemaining()) throw badRequest("No substitutions remaining");
            if (!quota.halftimeWindowFree() && quota.windowsRemaining() == 0)
                throw badRequest("No substitution windows remaining");
            changed = current;
            for (var change : changes) changed = engine.commandSession(input, changed, command.type(), controlledClubId,
                null, null, null, change.outgoingPlayerId(), change.incomingPlayerId());
        } else {
            changed = engine.commandSession(input, current, command.type(), controlledClubId,
                command.tactic(), command.lineup(), command.shout(), null, null);
        }
        validateState(changed);
        session.advance(requestId, write(changed));
        var response = save(session);
        remember(session, requestId, "COMMAND", response);
        return response;
    }

    @Transactional
    public FinishResult finish(Long ownerId, UUID careerId, UUID sessionId, UUID requestId, long expectedVersion) {
        requireRequest(requestId);
        lockRequest(requestId);
        var replay = replay(ownerId, careerId, sessionId, requestId, "FINISH", FinishResult.class);
        if (replay != null) return replay;
        var session = owned(ownerId, careerId, sessionId);
        if ("COMPLETED".equals(session.getStatus())) {
            var response = new FinishResult(session.getMatchId());
            remember(session, requestId, "FINISH", response);
            return response;
        }
        requireVersion(ownerId, careerId, session, expectedVersion);
        var input = read(session.getInputSnapshot(), MatchInput.class);
        var current = state(session);
        if (!completed(current))
            throw conflict(ownerId, careerId, sessionId, "Continue the match to full time before finishing");
        var result = engine.finishSession(input, current);
        var played = careers.finishInteractive(ownerId, careerId, session.getFixtureId(), input,
            "session-" + session.getId(), result);
        session.finish(requestId, played.matchId(), write(current));
        save(session);
        var response = new FinishResult(played.matchId());
        remember(session, requestId, "FINISH", response);
        return response;
    }

    @Transactional
    public void abandon(Long ownerId, UUID careerId, UUID sessionId, UUID requestId, long expectedVersion) {
        requireRequest(requestId);
        lockRequest(requestId);
        if (replay(ownerId, careerId, sessionId, requestId, "ABANDON", Ack.class) != null) return;
        var session = owned(ownerId, careerId, sessionId);
        requireVersion(ownerId, careerId, session, expectedVersion);
        session.abandon(requestId);
        sessions.saveAndFlush(session);
        remember(session, requestId, "ABANDON", new Ack());
    }

    private Snapshot save(MatchSessionEntity session) {
        try {
            return snapshot(sessions.saveAndFlush(session));
        } catch (ObjectOptimisticLockingFailureException exception) {
            throw conflict(session.getOwnerUserId(), session.getCareerSaveId(), session.getId(),
                "Match session changed; reload it before continuing");
        }
    }

    private <T> T replay(Long ownerId, UUID careerId, UUID sessionId, UUID requestId, String action, Class<T> type) {
        var stored = requests.findByRequestIdAndOwnerUserId(requestId, ownerId).orElse(null);
        if (stored == null) return null;
        if (!careerId.equals(stored.getCareerSaveId()) || !action.equals(stored.getAction())
            || sessionId != null && !sessionId.equals(stored.getSessionId()))
            throw conflict(ownerId, careerId, sessionId, "Request ID is already used");
        LOG.info("match_session replay action={} session={} request={}", action, stored.getSessionId(), requestId);
        return read(stored.getResponseSnapshot(), type);
    }

    private void lockRequest(UUID requestId) {
        requests.lockRequest(requestId.getMostSignificantBits() ^ requestId.getLeastSignificantBits());
    }

    private void remember(MatchSessionEntity session, UUID requestId, String action, Object response) {
        requests.saveAndFlush(new MatchSessionRequestEntity(requestId, session.getId(), session.getCareerSaveId(),
            session.getOwnerUserId(), action, write(response)));
        LOG.info("match_session action={} session={} fixture={} version={} request={}", action, session.getId(),
            session.getFixtureId(), session.getVersion(), requestId);
    }

    @Scheduled(cron = "${app.match-session-cleanup-cron:0 0 3 * * *}")
    @Transactional
    public void cleanupCompletedSessions() {
        var deleted = sessions.deleteByStatusInAndUpdatedAtBefore(List.of("COMPLETED", "ABANDONED"),
            Instant.now().minus(30, ChronoUnit.DAYS));
        if (deleted > 0) LOG.info("match_session cleanup deleted={}", deleted);
    }

    private MatchSessionEntity owned(Long ownerId, UUID careerId, UUID sessionId) {
        return sessions.findByIdAndCareerSaveIdAndOwnerUserId(sessionId, careerId, ownerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match session not found"));
    }

    private void requireVersion(Long ownerId, UUID careerId, MatchSessionEntity session, long expectedVersion) {
        if (!"ACTIVE".equals(session.getStatus()))
            throw conflict(ownerId, careerId, session.getId(), "Match session is already finished");
        if (expectedVersion < 0 || session.getVersion() != expectedVersion)
            throw conflict(ownerId, careerId, session.getId(), "Match session changed; reload it before continuing");
    }

    private Snapshot snapshot(MatchSessionEntity session) {
        var input = read(session.getInputSnapshot(), MatchInput.class);
        var controlledClubId = careers.get(session.getOwnerUserId(), session.getCareerSaveId()).getManagedClubId();
        var state = state(session);
        return toSnapshot(session, input, controlledClubId, state,
            currentTeam(state, "current_home", input.home()), currentTeam(state, "current_away", input.away()));
    }

    static Snapshot toSnapshot(MatchSessionEntity session, MatchInput input, UUID controlledClubId, JsonNode state) {
        return toSnapshot(session, input, controlledClubId, state, input.home(), input.away());
    }

    private static Snapshot toSnapshot(MatchSessionEntity session, MatchInput input, UUID controlledClubId,
                                       JsonNode state, TeamSnapshot currentHome, TeamSnapshot currentAway) {
        var events = state.path("events");
        if (!events.isArray()) events = JsonNodeFactory.instance.arrayNode();
        var active = "ACTIVE".equals(session.getStatus());
        var done = completed(state);
        return new Snapshot(session.getId(), session.getFixtureId(), session.getMatchId(), Math.min(90, minute(state)),
            new Score(state.path("home").path("goals").asInt(), state.path("away").path("goals").asInt()),
            session.getStatus(), session.getVersion(), pauseReason(state), controlledClubId,
            new TeamView(currentHome.id(), currentHome.name(), currentHome.lineup(), currentHome.tactic(), currentHome.inactivePlayerIds()),
            new TeamView(currentAway.id(), currentAway.name(), currentAway.lineup(), currentAway.tactic(), currentAway.inactivePlayerIds()),
            events, new LiveStats(teamStats(state, "home"), teamStats(state, "away")),
            substitutionQuota(state, controlledClubId), active && !done, active && done);
    }

    private JsonNode state(MatchSessionEntity session) {
        return read(session.getStateSnapshot(), JsonNode.class);
    }

    private TeamSnapshot currentTeam(JsonNode state, String field, TeamSnapshot fallback) {
        return state.has(field) ? read(state.path(field).toString(), TeamSnapshot.class) : fallback;
    }

    private static void validateCommand(MatchCommand command) {
        switch (command.type()) {
            case "TACTIC" -> {
                if (command.tactic() == null && command.lineup() == null) throw badRequest("Tactic or lineup is required");
            }
            case "SHOUT" -> {
                if (!java.util.Set.of("ENCOURAGE", "DEMAND_MORE", "FOCUS", "CALM_DOWN").contains(command.shout()))
                    throw badRequest("Unknown shout");
            }
            case "SUBSTITUTION" -> {
                var batch = command.substitutions();
                if ((batch == null || batch.isEmpty()) && (command.outgoingPlayerId() == null || command.incomingPlayerId() == null))
                    throw badRequest("Both substitution players are required");
                if (batch != null && (batch.isEmpty() || batch.size() > 5 || batch.stream().anyMatch(change ->
                    change.outgoingPlayerId() == null || change.incomingPlayerId() == null)))
                    throw badRequest("Substitution batch is invalid");
            }
            default -> throw badRequest("Unknown command type");
        }
    }

    private static int minute(JsonNode state) {
        return state.path("minute").asInt(0);
    }

    private static boolean completed(JsonNode state) {
        return state.path("completed").asBoolean(false);
    }

    private static String pauseReason(JsonNode state) {
        if (completed(state)) return "FULL_TIME";
        if (minute(state) <= 1) return "KICKOFF";
        if (state.path("half_time_added").asBoolean(false) && minute(state) < 55) return "HALF_TIME";
        return "MILESTONE";
    }

    private static ObjectNode teamStats(JsonNode state, String side) {
        var source = state.path(side);
        var other = state.path("home".equals(side) ? "away" : "home");
        var total = source.path("possessions").asInt() + other.path("possessions").asInt();
        var stats = JsonNodeFactory.instance.objectNode();
        for (var field : new String[]{"goals", "shots", "shots_on_target", "xg", "passes_attempted",
            "passes_completed", "fouls", "yellow_cards", "red_cards"}) stats.set(field, source.path(field));
        stats.put("possession", total == 0 ? 50.0 : Math.round(source.path("possessions").asInt() * 1000.0 / total) / 10.0);
        return stats;
    }

    private static SubstitutionQuota substitutionQuota(JsonNode state, UUID controlledClubId) {
        var used = 0;
        var windows = new LinkedHashSet<Integer>();
        for (var event : state.path("events")) {
            if (!"SUBSTITUTION".equals(event.path("type").asText())
                || !controlledClubId.toString().equals(event.path("team_id").asText())) continue;
            used++;
            if (!event.path("payload").path("halftime").asBoolean(false)) windows.add(event.path("minute").asInt());
        }
        var halftime = "HALF_TIME".equals(pauseReason(state));
        return new SubstitutionQuota(used, Math.max(0, 5 - used), windows.size(), Math.max(0, 3 - windows.size()), halftime);
    }

    static void validateState(JsonNode state) {
        if (state == null || !state.isObject() || minute(state) < 0)
            throw new IllegalStateException("Match engine returned an invalid session state");
        if (state.path("events").size() > MAX_EVENTS)
            throw new IllegalStateException("Match engine session has too many events");
        requireSize(state.toString(), MAX_STATE_BYTES, "Match state");
    }

    private static void requireSize(String value, int limit, String label) {
        if (value.getBytes(StandardCharsets.UTF_8).length > limit)
            throw new IllegalStateException(label + " exceeds " + limit + " bytes");
    }

    private static void requireRequest(UUID requestId) {
        if (requestId == null) throw badRequest("Request ID is required");
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Match session cannot be serialized", exception);
        }
    }

    private <T> T read(String value, Class<T> type) {
        try {
            return json.readValue(value, type);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored match session is invalid", exception);
        }
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static Conflict conflict(Long ownerId, UUID careerId, UUID sessionId, String message) {
        return new Conflict(ownerId, careerId, sessionId, message);
    }

    public record Snapshot(UUID id, UUID fixtureId, UUID matchId, int minute, Score score, String status,
                           long version, String pauseReason, UUID controlledClubId, TeamView home, TeamView away,
                           JsonNode events, LiveStats stats, SubstitutionQuota substitutions,
                           boolean canContinue, boolean canFinish) {}
    public record Score(int home, int away) {}
    public record TeamView(UUID id, String name, Lineup lineup, Tactic tactic, java.util.Set<UUID> inactivePlayerIds) {}
    public record LiveStats(JsonNode home, JsonNode away) {}
    public record FinishResult(UUID matchId) {}
    public record Ack() {}
    private record StartPayload(long seed, Lineup lineup, Tactic tactic) {}
    public record SubstitutionQuota(int playersUsed, int playersRemaining, int windowsUsed, int windowsRemaining,
                                    boolean halftimeWindowFree) {}
    public record Substitution(UUID outgoingPlayerId, UUID incomingPlayerId) {}
    public record MatchCommand(String type, Tactic tactic, Lineup lineup, String shout, UUID outgoingPlayerId,
                               UUID incomingPlayerId, List<Substitution> substitutions) {}

    public static final class Conflict extends RuntimeException {
        private final Long ownerId;
        private final UUID careerId;
        private final UUID sessionId;

        public Conflict(Long ownerId, UUID careerId, UUID sessionId, String message) {
            super(message);
            this.ownerId = ownerId;
            this.careerId = careerId;
            this.sessionId = sessionId;
        }

        public Long ownerId() { return ownerId; }
        public UUID careerId() { return careerId; }
        public UUID sessionId() { return sessionId; }
    }
}
