package com.footballverse.prediction;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FixtureService {

    private final FixtureRepository fixtureRepo;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Value("${app.match-engine.url:http://localhost:8090}")
    private String matchEngineUrl;

    @Transactional
    public List<Fixture> syncFixtures(String leagueSlug) {
        List<Fixture> synced = new ArrayList<>();
        String url = matchEngineUrl + "/matches/" + leagueSlug + "/fixtures";
        tryFetch(url, (fixtures) -> {
            for (JsonNode f : fixtures) {
                synced.add(upsert(f, leagueSlug, "upcoming"));
            }
        });
        return synced;
    }

    @Transactional
    public List<Fixture> syncResults(String leagueSlug) {
        List<Fixture> synced = new ArrayList<>();
        String url = matchEngineUrl + "/matches/" + leagueSlug + "/live";
        tryFetch(url, (fixtures) -> {
            for (JsonNode f : fixtures) {
                String status = f.has("status") ? f.get("status").asText() : "upcoming";
                synced.add(upsert(f, leagueSlug, status));
            }
        });
        return synced;
    }

    @Transactional
    public List<Fixture> syncFixturesForLeagueAndRound(String leagueSlug, String round) {
        List<Fixture> synced = new ArrayList<>();
        String url = matchEngineUrl + "/matches/" + leagueSlug + "/fixtures";
        if (round != null && !round.isEmpty()) {
            url += "?round=" + URLEncoder.encode(round, StandardCharsets.UTF_8);
        }
        tryFetch(url, (fixtures) -> {
            for (JsonNode f : fixtures) {
                synced.add(upsert(f, leagueSlug, "upcoming"));
            }
        });
        return synced;
    }

    /* ponytail: simple 2-retry loop with sleep. Ok for dev; use resilience4j when this becomes critical. */
    private void tryFetch(String url, java.util.function.Consumer<JsonNode> handler) {
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                        .GET()
                        .timeout(Duration.ofSeconds(15))
                        .build();
                String body = httpClient.send(req, HttpResponse.BodyHandlers.ofString()).body();
                JsonNode root = objectMapper.readTree(body);
                JsonNode fixtures = root.get("fixtures");
                if (fixtures != null && fixtures.isArray()) {
                    handler.accept(fixtures);
                    return;
                }
                return;
            } catch (Exception e) {
                if (attempt == 2) {
                    log.warn("match-engine fetch failed after 2 attempts: {}", url, e);
                } else {
                    try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
                }
            }
        }
    }

    private Fixture upsert(JsonNode f, String leagueSlug, String status) {
        String fixtureId = f.get("id").asText();
        Fixture match = fixtureRepo.findByFixtureId(fixtureId)
                .orElse(new Fixture());

        match.setFixtureId(fixtureId);
        match.setLeagueSlug(leagueSlug);
        match.setHomeTeam(f.get("homeTeam").get("name").asText());
        match.setAwayTeam(f.get("awayTeam").get("name").asText());

        if (f.has("round") && !f.get("round").isNull()) {
            match.setRound(f.get("round").asText());
        }
        if (f.has("kickoff") && !f.get("kickoff").isNull()) {
            match.setKickoff(Instant.from(DateTimeFormatter.ISO_OFFSET_DATE_TIME.parse(f.get("kickoff").asText())));
        }

        if (f.has("score") && !f.get("score").isNull()) {
            JsonNode score = f.get("score");
            if (score.has("home") && !score.get("home").isNull()) {
                match.setHomeScore(score.get("home").asInt());
            }
            if (score.has("away") && !score.get("away").isNull()) {
                match.setAwayScore(score.get("away").asInt());
            }
        }

        match.setStatus(status);
        return fixtureRepo.save(match);
    }
}
