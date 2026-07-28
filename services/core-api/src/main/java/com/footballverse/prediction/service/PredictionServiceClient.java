package com.footballverse.prediction.service;

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

    public JsonNode fetchFixtureDetail(String leagueSlug, String fixtureId) {
        return fetch(predictionServiceUrl + "/matches/" + encode(leagueSlug) + "/fixtures/" + encode(fixtureId));
    }

    public JsonNode fetchFixturePrediction(String leagueSlug, String fixtureId) {
        return fetch(predictionServiceUrl + "/predictions/" + encode(leagueSlug) + "/fixtures/" + encode(fixtureId));
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private JsonNode fetch(String url) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .GET()
                    .timeout(Duration.ofSeconds(6))
                    .build();
            HttpResponse<String> response = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("prediction-service responded with status {}", response.statusCode());
                return null;
            }
            return objectMapper.readTree(response.body());
        } catch (Exception e) {
            log.warn("prediction-service request failed: {}", e.getClass().getSimpleName());
            return null;
        }
    }
}
