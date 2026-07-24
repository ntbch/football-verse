package com.footballverse.game.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.footballverse.game.dto.MatchInput;
import com.footballverse.game.dto.MatchResult;
import com.footballverse.game.dto.Lineup;
import com.footballverse.game.dto.Tactic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class MatchEngineClient {
    private final RestClient client;

    public MatchEngineClient(@Value("${app.match-engine-url}") String baseUrl) {
        var requests = new SimpleClientHttpRequestFactory();
        requests.setConnectTimeout(Duration.ofSeconds(3));
        requests.setReadTimeout(Duration.ofSeconds(12));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(requests).build();
    }

    public MatchResult simulate(MatchInput input) {
        MatchResult result;
        try {
            result = client.post().uri("/simulate").contentType(MediaType.APPLICATION_JSON)
                .body(input).retrieve().body(MatchResult.class);
        } catch (HttpClientErrorException.UnprocessableEntity exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid lineup or tactics", exception);
        }
        if (result == null) {
            throw new IllegalStateException("Match engine returned an empty result");
        }
        return result;
    }

    public JsonNode startSession(MatchInput input) {
        return post("/session/start", Map.of("match", input), JsonNode.class);
    }

    public JsonNode advanceSession(MatchInput input, JsonNode state, int targetMinute) {
        return post("/session/advance", Map.of("match", input, "state", state, "target_minute", targetMinute), JsonNode.class);
    }

    public MatchResult finishSession(MatchInput input, JsonNode state) {
        return post("/session/finish", Map.of("match", input, "state", state), MatchResult.class);
    }

    public JsonNode commandSession(MatchInput input, JsonNode state, String type, UUID teamId, Tactic tactic, Lineup lineup,
                                   String shout, UUID outgoingPlayerId, UUID incomingPlayerId) {
        var command = new HashMap<String, Object>();
        command.put("type", type);
        command.put("team_id", teamId);
        if (tactic != null) command.put("tactic", tactic);
        if (lineup != null) command.put("lineup", lineup);
        if (shout != null) command.put("shout", shout);
        if (outgoingPlayerId != null) command.put("outgoing_player_id", outgoingPlayerId);
        if (incomingPlayerId != null) command.put("incoming_player_id", incomingPlayerId);
        return post("/session/command", Map.of("match", input, "state", state, "command", command), JsonNode.class);
    }

    private <T> T post(String uri, Object body, Class<T> type) {
        T result;
        try {
            result = client.post().uri(uri).contentType(MediaType.APPLICATION_JSON)
                .body(body).retrieve().body(type);
        } catch (HttpClientErrorException.UnprocessableEntity exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid lineup, tactics or match state", exception);
        }
        if (result == null) throw new IllegalStateException("Match engine returned an empty response");
        return result;
    }
}
