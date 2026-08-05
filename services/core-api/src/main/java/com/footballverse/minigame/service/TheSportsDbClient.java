package com.footballverse.minigame.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;

@Component
@Slf4j
public class TheSportsDbClient {
    private static final Duration MIN_REQUEST_INTERVAL = Duration.ofMillis(2_100);
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final String baseUrl;
    private final String apiKey;
    private Instant nextRequestAt = Instant.EPOCH;
    private Instant rateLimitedUntil = Instant.EPOCH;

    public TheSportsDbClient(ObjectMapper mapper,
                             @Value("${app.minigame.sports-db.base-url:https://www.thesportsdb.com/api/v1/json}") String baseUrl,
                             @Value("${app.minigame.sports-db.key:123}") String apiKey) {
        this.mapper = mapper;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.apiKey = apiKey;
    }

    public boolean configured() { return !apiKey.isBlank(); }
    public boolean rateLimited() { return Instant.now().isBefore(rateLimitedUntil); }
    public JsonNode searchPlayers(String name) { return get("/searchplayers.php?p=" + URLEncoder.encode(name, StandardCharsets.UTF_8)); }

    public synchronized JsonNode get(String pathAndQuery) {
        if (!configured() || rateLimited()) return mapper.createObjectNode();
        try {
            long waitMillis = Duration.between(Instant.now(), nextRequestAt).toMillis();
            if (waitMillis > 0) Thread.sleep(waitMillis);
            nextRequestAt = Instant.now().plus(MIN_REQUEST_INTERVAL);
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/" + apiKey + pathAndQuery))
                    .timeout(Duration.ofSeconds(15)).GET().build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 429) rateLimitedUntil = Instant.now().plus(Duration.ofMinutes(1));
            if (response.statusCode() != 200) {
                log.warn("TheSportsDB request failed with status {}", response.statusCode());
                return mapper.createObjectNode();
            }
            return mapper.readTree(response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return mapper.createObjectNode();
        } catch (Exception exception) {
            log.warn("TheSportsDB request failed: {}", exception.getClass().getSimpleName());
            return mapper.createObjectNode();
        }
    }
}
