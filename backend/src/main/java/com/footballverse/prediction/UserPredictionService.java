package com.footballverse.prediction;

import com.footballverse.common.exception.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import com.footballverse.prediction.dto.AiPredictionSummary;
import com.footballverse.prediction.dto.FixtureResponse;
import com.footballverse.prediction.dto.MatchCentreFixture;
import com.footballverse.prediction.dto.MatchCentreResponse;
import com.footballverse.prediction.dto.PredictionRequest;
import com.footballverse.prediction.dto.PredictionResponse;
import com.footballverse.prediction.dto.StandingResponse;
import com.footballverse.user.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserPredictionService {

    private final FixtureRepository fixtureRepo;
    private final UserPredictionRepository predictionRepo;
    private final FixtureService fixtureService;
    private final MatchEngineClient matchEngineClient;

    @Transactional(readOnly = true)
    public List<FixtureResponse> getFixturesWithPredictions(String leagueSlug, UserAccount currentUser) {
        List<Fixture> fixtures = fixtureRepo.findByLeagueSlugAndStatusOrderByKickoffAsc(leagueSlug, "upcoming");
        if (fixtures.isEmpty()) {
            fixtureService.syncFixtures(leagueSlug);
            fixtures = fixtureRepo.findByLeagueSlugAndStatusOrderByKickoffAsc(leagueSlug, "upcoming");
        }

        Long userId = currentUser != null ? currentUser.getId() : null;
        // Batch-load predictions to avoid N+1
        Map<Long, UserPrediction> predictionByFixtureId = Collections.emptyMap();
        if (userId != null && !fixtures.isEmpty()) {
            List<Long> fixtureIds = fixtures.stream().map(Fixture::getId).collect(Collectors.toList());
            predictionByFixtureId = predictionRepo.findByUserIdAndFixtureIdIn(userId, fixtureIds)
                    .stream()
                    .collect(Collectors.toMap(p -> p.getFixture().getId(), p -> p, (a, b) -> a));
        }

        final Map<Long, UserPrediction> lookup = predictionByFixtureId;
        return fixtures.stream()
                .map(f -> toFixtureResponse(f, lookup.get(f.getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PredictionResponse> myPredictions(Long userId, String leagueSlug) {
        return predictionRepo.findByUserIdAndFixtureLeagueSlug(userId, leagueSlug)
                .stream()
                .map(this::toPredictionResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PredictionResponse submitPrediction(UserAccount user, Long fixtureId, PredictionRequest request) {
        Fixture fixture = fixtureRepo.findById(fixtureId)
                .orElseThrow(() -> new BadRequestException("Fixture not found"));

        if (fixture.getKickoff().isBefore(Instant.now())) {
            throw new BadRequestException("Match already started, predictions closed");
        }
        if (!"upcoming".equals(fixture.getStatus())) {
            throw new BadRequestException("Match not open for predictions");
        }

        UserPrediction pred = predictionRepo.findByUserIdAndFixtureId(user.getId(), fixtureId)
                .orElseGet(UserPrediction::new);

        if (pred.getId() != null && fixture.isScored()) {
            throw new BadRequestException("Match already scored, cannot edit prediction");
        }

        pred.setUser(user);
        pred.setFixture(fixture);
        pred.setPick(request.pick());
        pred.setHomeScore(request.homeScore());
        pred.setAwayScore(request.awayScore());
        pred.setPickOu25(request.pickOu25());
        pred.setPickBtts(request.pickBtts());
        pred.setPoints(0);
        pred.setCorrect(false);

        predictionRepo.save(pred);
        return toPredictionResponse(pred);
    }

    private FixtureResponse toFixtureResponse(Fixture f, UserPrediction userPred) {
        PredictionResponse predResp = userPred != null ? toPredictionResponse(userPred) : null;

        return new FixtureResponse(
                f.getId(),
                f.getFixtureId(),
                f.getLeagueSlug(),
                f.getRound(),
                f.getHomeTeam(),
                f.getAwayTeam(),
                f.getKickoff().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
                f.getHomeScore(),
                f.getAwayScore(),
                f.getStatus(),
                predResp
        );
    }

    private PredictionResponse toPredictionResponse(UserPrediction p) {
        return new PredictionResponse(
                p.getId(),
                p.getFixture().getId(),
                p.getPick(),
                p.getHomeScore(),
                p.getAwayScore(),
                p.getPoints(),
                p.isCorrect(),
                p.getCorrectOutcome(),
                p.getCorrectExactScore(),
                p.getCorrectOu25(),
                p.getCorrectBtts(),
                p.getPickOu25(),
                p.getPickBtts()
        );
    }

    @Transactional(readOnly = true)
    public MatchCentreResponse matchCentre(String leagueSlug, String round, UserAccount currentUser) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        List<Fixture> allFixtures = fixtureRepo.findByLeagueSlugAndStatusOrderByKickoffAsc(leagueSlug, "upcoming");

        // Batch-load user predictions
        Map<Long, UserPrediction> predMap = Collections.emptyMap();
        if (userId != null && !allFixtures.isEmpty()) {
            List<Long> fixtureIds = allFixtures.stream().map(Fixture::getId).collect(Collectors.toList());
            predMap = predictionRepo.findByUserIdAndFixtureIdIn(userId, fixtureIds)
                    .stream()
                    .collect(Collectors.toMap(p -> p.getFixture().getId(), p -> p, (a, b) -> a));
        }

        // Build fixture ID → PredictionResponse map
        Map<String, PredictionResponse> predByFixtureId = predMap.values().stream()
                .collect(Collectors.toMap(p -> p.getFixture().getFixtureId(), this::toPredictionResponse, (a, b) -> a));

        // Fetch AI predictions + standings + rounds from match-engine
        JsonNode fixturesPayload = matchEngineClient.fetchFixtures(leagueSlug, round);
        JsonNode aiPayload = matchEngineClient.fetchPredictions(leagueSlug, round);
        JsonNode standingsPayload = matchEngineClient.fetchStandings(leagueSlug);
        JsonNode roundsPayload = matchEngineClient.fetchRounds(leagueSlug);

        Map<String, JsonNode> aiByFixtureId = indexAiPredictions(aiPayload);
        Map<String, Fixture> dbFixtureByFixtureId = allFixtures.stream()
                .collect(Collectors.toMap(Fixture::getFixtureId, f -> f, (a, b) -> a));

        // Build match-centre fixtures by crossing backend fixtures with AI predictions
        List<MatchCentreFixture> matchFixtures = new ArrayList<>();
        for (JsonNode aiFixture : getFixturesFromPayload(fixturesPayload, aiPayload)) {
            String matchId = aiFixture.get("id").asText();
            Fixture dbFixture = dbFixtureByFixtureId.get(matchId);
            JsonNode predNode = aiByFixtureId.get(matchId);
            PredictionResponse userPred = predByFixtureId.get(matchId);

            matchFixtures.add(buildMatchCentreFixture(dbFixture, aiFixture, predNode, userPred));
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
                id, fixtureId, /* leagueSlug as league */ "Premier League", roundName,
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
            standings.add(new StandingResponse(
                    row.get("rank").asInt(),
                    team != null ? team.get("id").asText() : "",
                    team != null ? team.get("name").asText() : "",
                    team != null && team.has("logo") && !team.get("logo").isNull() ? team.get("logo").asText() : "",
                    row.get("points").asInt(),
                    row.get("played").asInt()
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
