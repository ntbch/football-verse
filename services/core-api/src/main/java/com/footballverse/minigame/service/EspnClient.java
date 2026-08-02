package com.footballverse.minigame.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;

@Component
@Slf4j
class EspnClient {
    private static final Duration MIN_REQUEST_INTERVAL = Duration.ofMillis(700);
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final String baseUrl;
    private Instant nextRequestAt = Instant.EPOCH;

    EspnClient(ObjectMapper mapper,
               @Value("${app.minigame.espn.base-url:https://site.api.espn.com/apis/site/v2/sports/soccer}") String baseUrl) {
        this.mapper = mapper;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    synchronized JsonNode get(String path) {
        try {
            long waitMillis = Duration.between(Instant.now(), nextRequestAt).toMillis();
            if (waitMillis > 0) Thread.sleep(waitMillis);
            nextRequestAt = Instant.now().plus(MIN_REQUEST_INTERVAL);
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path)).timeout(Duration.ofSeconds(12)).GET().build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("ESPN request failed with status {}", response.statusCode());
                return mapper.createObjectNode();
            }
            return mapper.readTree(response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return mapper.createObjectNode();
        } catch (Exception exception) {
            log.warn("ESPN request failed: {}", exception.getClass().getSimpleName());
            return mapper.createObjectNode();
        }
    }
}
