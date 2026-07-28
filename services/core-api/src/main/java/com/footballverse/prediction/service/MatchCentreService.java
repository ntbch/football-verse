package com.footballverse.prediction.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.prediction.dto.AiPredictionSummary;
import com.footballverse.prediction.dto.MatchCentreFixture;
import com.footballverse.prediction.dto.MatchCentreResponse;
import com.footballverse.prediction.dto.MatchDetailResponse;
import com.footballverse.prediction.dto.LineupPlayerResponse;
import com.footballverse.prediction.dto.LineupResponse;
import com.footballverse.prediction.dto.LineupTeamResponse;
import com.footballverse.prediction.dto.PredictionResponse;
import com.footballverse.prediction.dto.SourceAvailability;
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
    private final FixtureService fixtureService;

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
        JsonNode standingsPayload = predictionServiceClient.fetchStandings(leagueSlug);
        JsonNode roundsPayload = predictionServiceClient.fetchRounds(leagueSlug);

        Map<String, Fixture> dbFixtureByFixtureId = allFixtures.stream()
                .collect(Collectors.toMap(Fixture::getFixtureId, f -> f, (a, b) -> a));

        List<MatchCentreFixture> matchFixtures = new ArrayList<>();
        List<JsonNode> apiFixtures = getFixturesFromPayload(fixturesPayload, null);
        if (apiFixtures.isEmpty()) {
            for (Fixture dbFixture : allFixtures) {
                PredictionResponse userPred = predByFixtureId.get(dbFixture.getFixtureId());
                matchFixtures.add(buildMatchCentreFixture(leagueSlug, dbFixture, null, null, userPred));
            }
        } else {
            for (JsonNode aiFixture : apiFixtures) {
                String matchId = aiFixture.get("id").asText();
                Fixture dbFixture = dbFixtureByFixtureId.get(matchId);
                PredictionResponse userPred = predByFixtureId.get(matchId);

                matchFixtures.add(buildMatchCentreFixture(leagueSlug, dbFixture, aiFixture, null, userPred));
            }
        }

        return new MatchCentreResponse(
                leagueSlug,
                round,
                matchFixtures,
                buildStandings(standingsPayload),
                buildRounds(roundsPayload),
                getCurrentRound(roundsPayload),
                availability(fixturesPayload),
                availability(standingsPayload),
                availability(roundsPayload)
        );
    }

    @Transactional
    public MatchDetailResponse matchDetail(String leagueSlug, String fixtureId, UserAccount currentUser) {
        JsonNode detail = predictionServiceClient.fetchFixtureDetail(leagueSlug, fixtureId);
        Fixture fixture = fixtureRepo.findByFixtureIdAndLeagueSlug(fixtureId, leagueSlug)
                .orElseGet(() -> syncKnownFixture(leagueSlug, fixtureId, detail));
        PredictionResponse userPrediction = currentUser == null ? null : predictionRepo
                .findByUserIdAndFixtureId(currentUser.getId(), fixture.getId())
                .map(userPredictionService::toPredictionResponse)
                .orElse(null);
        JsonNode sourceFixture = detail == null ? null : detail.get("fixture");
        JsonNode predictionPayload = predictionServiceClient.fetchFixturePrediction(leagueSlug, fixtureId);
        JsonNode aiPrediction = predictionPayload == null ? null : predictionPayload.get("prediction");

        return new MatchDetailResponse(
                buildMatchCentreFixture(leagueSlug, fixture, sourceFixture, aiPrediction, userPrediction),
                lineups(detail)
        );
    }

    private Fixture syncKnownFixture(String leagueSlug, String fixtureId, JsonNode detail) {
        JsonNode sourceFixture = detail == null ? null : detail.get("fixture");
        if (sourceFixture == null || sourceFixture.isNull()) {
            throw new BadRequestException("Fixture not found");
        }
        fixtureService.syncFixturesForLeagueAndRound(leagueSlug, safeText(sourceFixture, "round", null));
        return fixtureRepo.findByFixtureIdAndLeagueSlug(fixtureId, leagueSlug)
                .orElseThrow(() -> new BadRequestException("Fixture not found"));
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

    private MatchCentreFixture buildMatchCentreFixture(String leagueSlug, Fixture db, JsonNode aiFixture, JsonNode predNode, PredictionResponse userPred) {
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
                id, fixtureId, leagueSlug, roundName,
                status, kickoff, homeTeam, awayTeam, homeLogo, awayLogo,
                homeScore, awayScore, ai, userPred
        );
    }

    private LineupResponse lineups(JsonNode detail) {
        JsonNode lineups = detail == null ? null : detail.get("lineups");
        if (lineups == null || lineups.isNull()) {
            return new LineupResponse("PROVIDER_UNAVAILABLE", null, null, List.of());
        }
        List<LineupTeamResponse> teams = new ArrayList<>();
        JsonNode sourceTeams = lineups.get("teams");
        if (sourceTeams != null && sourceTeams.isArray()) {
            for (JsonNode team : sourceTeams) {
                teams.add(new LineupTeamResponse(
                        safeText(team, "teamId", ""),
                        safeText(team, "teamName", null),
                        safeText(team, "teamLogo", null),
                        safeText(team, "formation", null),
                        lineupPlayers(team.get("startingXI")),
                        lineupPlayers(team.get("substitutes"))
                ));
            }
        }
        return new LineupResponse(
                safeText(lineups, "coverage", "PROVIDER_UNAVAILABLE"),
                safeText(lineups, "sourceUpdatedAt", null),
                safeText(lineups, "fetchedAt", null),
                teams
        );
    }

    private List<LineupPlayerResponse> lineupPlayers(JsonNode players) {
        if (players == null || !players.isArray()) return List.of();
        List<LineupPlayerResponse> result = new ArrayList<>();
        for (JsonNode player : players) {
            result.add(new LineupPlayerResponse(
                    safeText(player, "id", ""),
                    safeText(player, "name", null),
                    player.has("number") && !player.get("number").isNull() ? player.get("number").asInt() : null,
                    safeText(player, "position", null)
            ));
        }
        return result;
    }

    private AiPredictionSummary aiSummary(JsonNode pred) {
        JsonNode p = pred.get("probabilities");
        JsonNode markets = pred.get("markets");
        JsonNode form = pred.get("form");
        if (p == null || markets == null || form == null
                || !p.has("home") || !p.has("draw") || !p.has("away")
                || !pred.has("pick") || !pred.has("pickLabel")
                || !pred.has("averageGoals") || !pred.has("confidence")
                || !markets.has("overUnder25") || !markets.has("bothTeamsToScore")
                || !form.has("home") || !form.has("away") || !pred.has("sampleSize")) {
            return null;
        }
        return new AiPredictionSummary(
                p.get("home").asInt(),
                p.get("draw").asInt(),
                p.get("away").asInt(),
                safeText(pred, "pick", null),
                safeText(pred, "pickLabel", null),
                null,
                pred.get("averageGoals").asDouble(),
                pred.get("confidence").asInt(),
                safeText(markets, "overUnder25", null),
                safeText(markets, "bothTeamsToScore", null),
                jsonArrayToList(form.get("home")),
                jsonArrayToList(form.get("away")),
                null,
                pred.get("sampleSize").asInt(),
                safeText(pred, "sourceUpdatedAt", null)
        );
    }

    private SourceAvailability availability(JsonNode payload) {
        JsonNode source = payload == null ? null : payload.get("availability");
        if (source == null || source.isNull()) {
            return new SourceAvailability("PROVIDER_UNAVAILABLE", null, null, null, null, null);
        }
        Integer retryAfter = source.has("retryAfterSeconds") && !source.get("retryAfterSeconds").isNull()
                ? source.get("retryAfterSeconds").asInt() : null;
        return new SourceAvailability(
                safeText(source, "state", "PROVIDER_UNAVAILABLE"),
                safeText(source, "provider", null),
                safeText(source, "season", null),
                safeText(source, "fetchedAt", null),
                safeText(source, "sourceUpdatedAt", null),
                retryAfter
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
            if (team == null || !row.hasNonNull("rank") || !row.hasNonNull("points") || !row.hasNonNull("played")) {
                continue;
            }

            standings.add(new StandingResponse(
                    row.get("rank").asInt(),
                    safeText(team, "id", null),
                    safeText(team, "name", null),
                    safeText(team, "logo", null),
                    row.get("points").asInt(),
                    row.get("played").asInt(),
                    nullableInt(row, "wins"),
                    nullableInt(row, "draws"),
                    nullableInt(row, "losses"),
                    nullableInt(row, "goalsFor"),
                    nullableInt(row, "goalsAgainst"),
                    nullableInt(row, "goalDifference")
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

    private Integer nullableInt(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asInt() : null;
    }
}
