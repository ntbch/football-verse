package com.footballverse.prediction.service;
import com.footballverse.prediction.model.Fixture;
import com.footballverse.prediction.repository.FixtureRepository;

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

    @Value("${app.prediction-service.url:http://localhost:8090}")
    private String predictionServiceUrl;

    @Value("${app.football-api-key:${FOOTBALL_API_KEY:}}")
    private String footballApiKey;

    @Transactional
    public List<Fixture> syncFixtures(String leagueSlug) {
        List<Fixture> synced = new ArrayList<>();
        String url = predictionServiceUrl + "/matches/" + leagueSlug + "/fixtures";
        boolean fetched = tryFetch(url, (fixtures) -> {
            for (JsonNode f : fixtures) {
                synced.add(upsert(f, leagueSlug, statusOf(f)));
            }
        });
        if (!fetched && footballApiKey != null && !footballApiKey.isBlank()) {
            syncFromFootballDataOrg(leagueSlug, synced);
        }
        return synced;
    }

    @Transactional
    public List<Fixture> syncResults(String leagueSlug) {
        List<Fixture> synced = new ArrayList<>();
        String url = predictionServiceUrl + "/matches/" + leagueSlug + "/live";
        tryFetch(url, (fixtures) -> {
            for (JsonNode f : fixtures) {
                synced.add(upsert(f, leagueSlug, statusOf(f)));
            }
        });
        return synced;
    }

    @Transactional
    public List<Fixture> syncFixturesForLeagueAndRound(String leagueSlug, String round) {
        List<Fixture> synced = new ArrayList<>();
        String url = predictionServiceUrl + "/matches/" + leagueSlug + "/fixtures";
        if (round != null && !round.isEmpty()) {
            url += "?round=" + URLEncoder.encode(round, StandardCharsets.UTF_8);
        }
        tryFetch(url, (fixtures) -> {
            for (JsonNode f : fixtures) {
                synced.add(upsert(f, leagueSlug, statusOf(f)));
            }
        });
        return synced;
    }

    /**
     * Resolve fixture status from the external payload so finished matches are stored
     * as "result" (and live as "live") instead of always defaulting to "upcoming".
     * Without this, ScoringScheduler never picks them up and predictions stay unscored.
     */
    private String statusOf(JsonNode fixture) {
        JsonNode status = fixture.get("status");
        if (status == null || status.isNull() || status.asText().isBlank()) {
            return "upcoming";
        }
        return status.asText();
    }

    /* ponytail: simple 2-retry loop with sleep. Ok for dev; use resilience4j when this becomes critical. */
    private boolean tryFetch(String url, java.util.function.Consumer<JsonNode> handler) {
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                        .GET()
                        .timeout(Duration.ofSeconds(15))
                        .build();
                String body = httpClient.send(req, HttpResponse.BodyHandlers.ofString()).body();
                JsonNode root = objectMapper.readTree(body);
                JsonNode fixtures = root.get("fixtures");
                if (fixtures != null && fixtures.isArray() && fixtures.size() > 0) {
                    handler.accept(fixtures);
                    return true;
                }
                return false;
            } catch (Exception e) {
                if (attempt == 2) {
                    log.warn("prediction-service fetch failed after 2 attempts: {}", url, e);
                } else {
                    try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
                }
            }
        }
        return false;
    }

    private void syncFromFootballDataOrg(String leagueSlug, List<Fixture> synced) {
        String code = "PL";
        if ("la-liga".equals(leagueSlug)) code = "PD";
        if ("champions-league".equals(leagueSlug)) code = "CL";
        if ("serie-a".equals(leagueSlug)) code = "SA";
        if ("bundesliga".equals(leagueSlug)) code = "BL1";

        String url = "https://api.football-data.org/v4/competitions/" + code + "/matches";
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .header("X-Auth-Token", footballApiKey)
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .build();
            String body = httpClient.send(req, HttpResponse.BodyHandlers.ofString()).body();
            JsonNode root = objectMapper.readTree(body);
            JsonNode matches = root.get("matches");
            if (matches != null && matches.isArray()) {
                for (JsonNode m : matches) {
                    String fixtureId = "fd_" + m.get("id").asText();
                    Fixture fixture = fixtureRepo.findByFixtureId(fixtureId).orElse(new Fixture());
                    fixture.setFixtureId(fixtureId);
                    fixture.setLeagueSlug(leagueSlug);
                    fixture.setHomeTeam(m.get("homeTeam").get("name").asText());
                    fixture.setAwayTeam(m.get("awayTeam").get("name").asText());
                    if (m.has("matchday") && !m.get("matchday").isNull()) {
                        fixture.setRound("Matchday " + m.get("matchday").asText());
                    }
                    if (m.has("utcDate") && !m.get("utcDate").isNull()) {
                        fixture.setKickoff(Instant.parse(m.get("utcDate").asText()));
                    }
                    String status = m.has("status") && !m.get("status").isNull() ? m.get("status").asText().toLowerCase() : "upcoming";
                    if ("finished".equals(status)) status = "result";
                    if ("in_play".equals(status) || "paused".equals(status)) status = "live";
                    fixture.setStatus(status);

                    if (m.has("score") && !m.get("score").isNull() && m.get("score").has("fullTime")) {
                        JsonNode ft = m.get("score").get("fullTime");
                        if (ft.has("home") && !ft.get("home").isNull()) fixture.setHomeScore(ft.get("home").asInt());
                        if (ft.has("away") && !ft.get("away").isNull()) fixture.setAwayScore(ft.get("away").asInt());
                    }
                    synced.add(fixtureRepo.save(fixture));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch matches directly from Football-Data.org: {}", e.getMessage());
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
