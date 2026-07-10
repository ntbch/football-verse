package com.footballverse.game.engine;

import com.footballverse.game.dto.MatchInput;
import com.footballverse.game.dto.MatchResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Component
public class MatchEngineClient {
    private final RestClient client;

    public MatchEngineClient(@Value("${app.match-engine-url}") String baseUrl) {
        this.client = RestClient.builder().baseUrl(baseUrl)
            .requestFactory(new SimpleClientHttpRequestFactory()).build();
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
}
