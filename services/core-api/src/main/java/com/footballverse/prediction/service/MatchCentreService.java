package com.footballverse.prediction.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.footballverse.prediction.dto.AiPredictionSummary;
import com.footballverse.prediction.dto.MatchCentreFixture;
import com.footballverse.prediction.dto.MatchCentreResponse;
import com.footballverse.prediction.dto.PredictionResponse;
import com.footballverse.prediction.dto.StandingResponse;
import com.footballverse.prediction.model.Fixture;
import com.footballverse.prediction.model.UserPrediction;
import com.footballverse.prediction.repository.FixtureRepository;
import com.footballverse.prediction.repository.UserPredictionRepository;
import com.footballverse.user.model.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchCentreService {

    private final FixtureRepository fixtureRepo;
    private final UserPredictionRepository predictionRepo;
    private final PredictionServiceClient predictionServiceClient;
    private final UserPredictionService userPredictionService;

    @Transactional(readOnly = true)
    public MatchCentreResponse matchCentre(String leagueSlug, String round, UserAccount currentUser) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        List<Fixture> allFixtures;
        if (round != null && !round.isEmpty()) {
            allFixtures = fixtureRepo.findByLeagueSlugAndRoundOrderByKickoffAsc(leagueSlug, round);
        } else {
            allFixtures = fixtureRepo.findByLeagueSlugOrderByKickoffAsc(leagueSlug);
        }

        Map<Long, UserPrediction> predMap = Collections.emptyMap();
        if (userId != null && !allFixtures.isEmpty()) {
            List<Long> fixtureIds = allFixtures.stream().map(Fixture::getId).collect(Collectors.toList());
            predMap = predictionRepo.findByUserIdAndFixtureIdIn(userId, fixtureIds)
                    .stream()
                    .collect(Collectors.toMap(p -> p.getFixture().getId(), p -> p, (a, b) -> a));
        }

        Map<String, PredictionResponse> predByFixtureId = predMap.values().stream()
                .collect(Collectors.toMap(p -> p.getFixture().getFixtureId(), p -> userPredictionService.toPredictionResponse(p), (a, b) -> a));

        JsonNode fixturesPayload = predictionServiceClient.fetchFixtures(leagueSlug, round);
        JsonNode aiPayload = predictionServiceClient.fetchPredictions(leagueSlug, round);
        JsonNode standingsPayload = predictionServiceClient.fetchStandings(leagueSlug);
        JsonNode roundsPayload = predictionServiceClient.fetchRounds(leagueSlug);

        Map<String, JsonNode> aiByFixtureId = indexAiPredictions(aiPayload);
        Map<String, Fixture> dbFixtureByFixtureId = allFixtures.stream()
                .collect(Collectors.toMap(Fixture::getFixtureId, f -> f, (a, b) -> a));

        List<MatchCentreFixture> matchFixtures = new ArrayList<>();
        List<JsonNode> apiFixtures = getFixturesFromPayload(fixturesPayload, aiPayload);
        if (apiFixtures.isEmpty()) {
            for (Fixture dbFixture : allFixtures) {
                JsonNode predNode = aiByFixtureId.get(dbFixture.getFixtureId());
                PredictionResponse userPred = predByFixtureId.get(dbFixture.getFixtureId());
                matchFixtures.add(buildMatchCentreFixture(dbFixture, null, predNode, userPred));
            }
        } else {
            for (JsonNode aiFixture : apiFixtures) {
                String matchId = aiFixture.get("id").asText();
                Fixture dbFixture = dbFixtureByFixtureId.get(matchId);
                JsonNode predNode = aiByFixtureId.get(matchId);
                PredictionResponse userPred = predByFixtureId.get(matchId);

                matchFixtures.add(buildMatchCentreFixture(dbFixture, aiFixture, predNode, userPred));
            }
        }

        return new MatchCentreResponse(
                leagueSlug,
                round,
                matchFixtures,
                buildStandings(standingsPayload),
                buildRounds(roundsPayload),
                getCurrentRound(roundsPayload)
        );
    }

    private Map<String, JsonNode> indexAiPredictions(JsonNode aiPayload) {
        if (aiPayload == null || !aiPayload.has("predictions")) return Collections.emptyMap();
        Map<String, JsonNode> map = new java.util.LinkedHashMap<>();
        for (JsonNode p : aiPayload.get("predictions")) {
            JsonNode fixture = p.get("fixture");
            if (fixture != null && fixture.has("id")) {
                map.put(fixture.get("id").asText(), p);
            }
        }
        return map;
    }

    private List<JsonNode> getFixturesFromPayload(JsonNode fixturesPayload, JsonNode aiPayload) {
        List<JsonNode> fixtures = new ArrayList<>();
        if (fixturesPayload != null && fixturesPayload.has("fixtures")) {
            for (JsonNode f : fixturesPayload.get("fixtures")) {
                fixtures.add(f);
            }
        }
        if (!fixtures.isEmpty()) {
            return fixtures;
        }
        if (aiPayload != null && aiPayload.has("predictions")) {
            for (JsonNode p : aiPayload.get("predictions")) {
                if (p.has("fixture")) fixtures.add(p.get("fixture"));
            }
        }
        return fixtures;
    }

    private MatchCentreFixture buildMatchCentreFixture(Fixture db, JsonNode aiFixture, JsonNode predNode, PredictionResponse userPred) {
        String kickoff = "";
        if (db != null && db.getKickoff() != null) {
            kickoff = db.getKickoff().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        } else if (aiFixture != null && aiFixture.has("kickoff")) {
            kickoff = aiFixture.get("kickoff").asText();
        }

        String homeTeam = db != null ? db.getHomeTeam() : teamName(aiFixture, "homeTeam");
        String awayTeam = db != null ? db.getAwayTeam() : teamName(aiFixture, "awayTeam");
        String homeLogo = teamLogo(aiFixture, "homeTeam");
        String awayLogo = teamLogo(aiFixture, "awayTeam");
        String status = db != null ? db.getStatus() : safeText(aiFixture, "status", "upcoming");
        String roundName = db != null && db.getRound() != null ? db.getRound() : safeText(aiFixture, "round", null);
        String fixtureId = db != null ? db.getFixtureId() : safeText(aiFixture, "id", "");
        long id = db != null ? db.getId() : 0;
        Integer homeScore = db != null ? db.getHomeScore() : null;
        Integer awayScore = db != null ? db.getAwayScore() : null;

        AiPredictionSummary ai = predNode != null ? aiSummary(predNode) : null;

        return new MatchCentreFixture(
                id, fixtureId, "Premier League", roundName,
                status, kickoff, homeTeam, awayTeam, homeLogo, awayLogo,
                homeScore, awayScore, ai, userPred
        );
    }

    private AiPredictionSummary aiSummary(JsonNode pred) {
        JsonNode p = pred.get("probabilities");
        JsonNode markets = pred.get("markets");
        JsonNode form = pred.get("form");
        return new AiPredictionSummary(
                p != null ? p.get("home").asInt() : 0,
                p != null ? p.get("draw").asInt() : 0,
                p != null ? p.get("away").asInt() : 0,
                safeText(pred, "pick", ""),
                safeText(pred, "pickLabel", ""),
                safeText(pred, "correctScore", ""),
                pred.has("averageGoals") ? pred.get("averageGoals").asDouble() : 0.0,
                pred.has("confidence") ? pred.get("confidence").asInt() : 0,
                markets != null ? safeText(markets, "overUnder25", "") : "",
                markets != null ? safeText(markets, "bothTeamsToScore", "") : "",
                form != null ? jsonArrayToList(form.get("home")) : List.of(),
                form != null ? jsonArrayToList(form.get("away")) : List.of(),
                safeText(pred, "trend", "")
        );
    }

    private List<String> jsonArrayToList(JsonNode arr) {
        if (arr == null || !arr.isArray()) return List.of();
        List<String> result = new ArrayList<>();
        for (JsonNode e : arr) result.add(e.asText());
        return result;
    }

    private String teamName(JsonNode fixture, String key) {
        if (fixture == null || !fixture.has(key)) return "Unknown";
        return fixture.get(key).get("name").asText();
    }

    private String teamLogo(JsonNode fixture, String key) {
        if (fixture == null || !fixture.has(key)) return "";
        JsonNode logo = fixture.get(key).get("logo");
        return logo == null || logo.isNull() ? "" : logo.asText();
    }

    private String safeText(JsonNode node, String field, String defaultValue) {
        if (node == null || !node.has(field) || node.get(field).isNull()) return defaultValue;
        return node.get(field).asText();
    }

    private List<StandingResponse> buildStandings(JsonNode payload) {
        if (payload == null || !payload.has("standings")) return List.of();
        List<StandingResponse> standings = new ArrayList<>();
        for (JsonNode row : payload.get("standings")) {
            JsonNode team = row.get("team");
            int wins = row.has("wins") ? row.get("wins").asInt() : 0;
            int draws = row.has("draws") ? row.get("draws").asInt() : 0;
            int losses = row.has("losses") ? row.get("losses").asInt() : 0;
            int goalsFor = row.has("goalsFor") ? row.get("goalsFor").asInt() : 0;
            int goalsAgainst = row.has("goalsAgainst") ? row.get("goalsAgainst").asInt() : 0;
            int goalDifference = row.has("goalDifference") ? row.get("goalDifference").asInt() : 0;

            standings.add(new StandingResponse(
                    row.get("rank").asInt(),
                    team != null ? team.get("id").asText() : "",
                    team != null ? team.get("name").asText() : "",
                    team != null && team.has("logo") && !team.get("logo").isNull() ? team.get("logo").asText() : "",
                    row.get("points").asInt(),
                    row.get("played").asInt(),
                    wins,
                    draws,
                    losses,
                    goalsFor,
                    goalsAgainst,
                    goalDifference
            ));
        }
        return standings;
    }

    private List<String> buildRounds(JsonNode payload) {
        if (payload == null || !payload.has("rounds")) return List.of();
        List<String> rounds = new ArrayList<>();
        for (JsonNode r : payload.get("rounds")) rounds.add(r.asText());
        return rounds;
    }

    private String getCurrentRound(JsonNode payload) {
        if (payload == null || !payload.has("currentRound") || payload.get("currentRound").isNull()) return null;
        return payload.get("currentRound").asText();
    }
}
