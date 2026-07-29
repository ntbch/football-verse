package com.footballverse.prediction.controller;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.prediction.dto.FixtureResponse;
import com.footballverse.prediction.dto.CommunityPredictionDistributionResponse;
import com.footballverse.prediction.dto.CurrentLeaderboardResponse;
import com.footballverse.prediction.dto.JoinPrivateLeagueRequest;
import com.footballverse.prediction.dto.LeaderboardEntryResponse;
import com.footballverse.prediction.dto.MatchCentreResponse;
import com.footballverse.prediction.dto.MatchDetailResponse;
import com.footballverse.prediction.dto.PredictionRequest;
import com.footballverse.prediction.dto.PredictionResponse;
import com.footballverse.prediction.dto.PredictionScoreLogResponse;
import com.footballverse.prediction.dto.PrivateLeagueRequest;
import com.footballverse.prediction.dto.PrivateLeagueResponse;
import com.footballverse.prediction.dto.StatsResponse;
import com.footballverse.prediction.service.LeaderboardService;
import com.footballverse.prediction.service.MatchCentreService;
import com.footballverse.prediction.service.PrivateLeagueService;
import com.footballverse.prediction.service.ScoringService;
import com.footballverse.prediction.service.UserPredictionService;
import com.footballverse.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/predictions")
@RequiredArgsConstructor
public class PredictionController {

    private final UserPredictionService predictionService;
    private final MatchCentreService matchCentreService;
    private final LeaderboardService leaderboardService;
    private final ScoringService scoringService;
    private final CurrentUser currentUser;
    private final PrivateLeagueService privateLeagueService;

    @GetMapping("/fixtures")
    public ApiResponse<List<FixtureResponse>> fixtures(
            @RequestParam(defaultValue = "premier-league") String league
    ) {
        return ApiResponse.ok(predictionService.getFixturesWithPredictions(league, currentUser.getOrNull()));
    }

    @PostMapping("/{fixtureId}")
    public ApiResponse<PredictionResponse> predict(
            @PathVariable Long fixtureId,
            @Valid @RequestBody PredictionRequest request
    ) {
        return ApiResponse.ok(predictionService.submitPrediction(currentUser.get(), fixtureId, request));
    }

    @GetMapping("/mine")
    public ApiResponse<List<PredictionResponse>> myPredictions(
            @RequestParam(defaultValue = "premier-league") String league
    ) {
        return ApiResponse.ok(predictionService.myPredictions(currentUser.get().getId(), league));
    }

    @GetMapping("/stats")
    public ApiResponse<StatsResponse> stats() {
        return ApiResponse.ok(leaderboardService.stats(currentUser.get().getId()));
    }

    @GetMapping("/leaderboard/me")
    public ApiResponse<CurrentLeaderboardResponse> currentLeaderboard(
            @RequestParam(defaultValue = "weekly") String period
    ) {
        return ApiResponse.ok(leaderboardService.currentLeaderboard(currentUser.get().getId(), period));
    }

    @GetMapping("/score-logs")
    public ApiResponse<List<PredictionScoreLogResponse>> scoreLogs() {
        return ApiResponse.ok(scoringService.getScoreLogs(currentUser.get().getId()));
    }

    @GetMapping("/leagues")
    public ApiResponse<PageResponse<PrivateLeagueResponse>> privateLeagues(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ApiResponse.ok(privateLeagueService.mine(
                Math.min(Math.max(page, 0), 10_000),
                Math.min(Math.max(size, 1), 20)
        ));
    }

    @PostMapping("/leagues")
    public ApiResponse<PrivateLeagueResponse> createPrivateLeague(
            @Valid @RequestBody PrivateLeagueRequest request,
            @RequestHeader(name = "X-Request-ID") UUID requestId
    ) {
        return ApiResponse.ok(privateLeagueService.create(request, requestId));
    }

    @PostMapping("/leagues/join")
    public ApiResponse<PrivateLeagueResponse> joinPrivateLeague(@Valid @RequestBody JoinPrivateLeagueRequest request) {
        return ApiResponse.ok(privateLeagueService.join(request));
    }

    @GetMapping("/{fixtureId}/score-log")
    public ApiResponse<PredictionScoreLogResponse> scoreLog(@PathVariable Long fixtureId) {
        return ApiResponse.ok(scoringService.getScoreLog(currentUser.get().getId(), fixtureId));
    }

    @GetMapping("/{fixtureId}/community-distribution")
    public ApiResponse<CommunityPredictionDistributionResponse> communityDistribution(@PathVariable Long fixtureId) {
        return ApiResponse.ok(predictionService.communityDistribution(fixtureId));
    }

    @GetMapping("/leaderboard")
    public ApiResponse<List<LeaderboardEntryResponse>> leaderboard(
            @RequestParam(defaultValue = "weekly") String period,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return ApiResponse.ok(leaderboardService.leaderboard(period, Math.min(Math.max(limit, 1), 100)));
    }

    @GetMapping("/leaderboard/page")
    public ApiResponse<PageResponse<LeaderboardEntryResponse>> leaderboardPage(
            @RequestParam(defaultValue = "weekly") String period,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(leaderboardService.leaderboardPage(
                period,
                Math.min(Math.max(page, 0), 10_000),
                Math.min(Math.max(size, 1), 50)
        ));
    }

    @GetMapping("/match-centre")
    public ApiResponse<MatchCentreResponse> matchCentre(
            @RequestParam(defaultValue = "premier-league") String league,
            @RequestParam(required = false) String round,
            HttpServletResponse response
    ) {
        response.setHeader("Cache-Control", "private, no-store");
        return ApiResponse.ok(matchCentreService.matchCentre(league, round, currentUser.getOrNull()));
    }

    @GetMapping("/match-centre/{fixtureId}")
    public ApiResponse<MatchDetailResponse> matchDetail(
            @PathVariable String fixtureId,
            @RequestParam(defaultValue = "premier-league") String league,
            HttpServletResponse response
    ) {
        response.setHeader("Cache-Control", "private, no-store");
        return ApiResponse.ok(matchCentreService.matchDetail(league, fixtureId, currentUser.getOrNull()));
    }
}
