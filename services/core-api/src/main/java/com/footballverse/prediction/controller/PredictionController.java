package com.footballverse.prediction.controller;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.prediction.dto.FixtureResponse;
import com.footballverse.prediction.dto.LeaderboardEntryResponse;
import com.footballverse.prediction.dto.MatchCentreResponse;
import com.footballverse.prediction.dto.MatchDetailResponse;
import com.footballverse.prediction.dto.PredictionRequest;
import com.footballverse.prediction.dto.PredictionResponse;
import com.footballverse.prediction.dto.PredictionScoreLogResponse;
import com.footballverse.prediction.dto.StatsResponse;
import com.footballverse.prediction.service.LeaderboardService;
import com.footballverse.prediction.service.MatchCentreService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/predictions")
@RequiredArgsConstructor
public class PredictionController {

    private final UserPredictionService predictionService;
    private final MatchCentreService matchCentreService;
    private final LeaderboardService leaderboardService;
    private final ScoringService scoringService;
    private final CurrentUser currentUser;

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

    @GetMapping("/score-logs")
    public ApiResponse<List<PredictionScoreLogResponse>> scoreLogs() {
        return ApiResponse.ok(scoringService.getScoreLogs(currentUser.get().getId()));
    }

    @GetMapping("/leaderboard")
    public ApiResponse<List<LeaderboardEntryResponse>> leaderboard(
            @RequestParam(defaultValue = "weekly") String period,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return ApiResponse.ok(leaderboardService.leaderboard(period, Math.min(Math.max(limit, 1), 100)));
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
