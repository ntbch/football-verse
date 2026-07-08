package com.footballverse.prediction;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Component
@RequiredArgsConstructor
@Slf4j
public class PredictionServiceClient {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Value("${app.prediction-service.url:http://localhost:8090}")
    private String predictionServiceUrl;

    public JsonNode fetchPredictions(String leagueSlug, String round) {
        String url = predictionServiceUrl + "/predictions/" + leagueSlug;
        if (round != null && !round.isEmpty()) {
            url += "?round=" + encode(round);
        }
        return fetch(url);
    }

    public JsonNode fetchRounds(String leagueSlug) {
        return fetch(predictionServiceUrl + "/matches/" + leagueSlug + "/rounds");
    }

    public JsonNode fetchStandings(String leagueSlug) {
        return fetch(predictionServiceUrl + "/standings/" + leagueSlug);
    }

    public JsonNode fetchFixtures(String leagueSlug, String round) {
        String url = predictionServiceUrl + "/matches/" + leagueSlug + "/fixtures";
        if (round != null && !round.isEmpty()) {
            url += "?round=" + encode(round);
        }
        return fetch(url);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private JsonNode fetch(String url) {
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                        .GET()
                        .timeout(Duration.ofSeconds(15))
                        .build();
                String body = httpClient.send(req, HttpResponse.BodyHandlers.ofString()).body();
                return objectMapper.readTree(body);
            } catch (Exception e) {
                if (attempt == 2) {
                    log.warn("prediction-service fetch failed after 2 attempts: {}", url, e);
                    return null;
                }
                try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
            }
        }
        return null;
    }
}
