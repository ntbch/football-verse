package com.footballverse.prediction.controller;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.prediction.dto.MatchCentreResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/matches")
@RequiredArgsConstructor
public class MatchesController {

    private final PredictionController predictionController;

    @GetMapping("/centre")
    public ApiResponse<MatchCentreResponse> matchCentre(
            @RequestParam(defaultValue = "premier-league") String league,
            @RequestParam(required = false) String round
    ) {
        return predictionController.matchCentre(league, round);
    }
}
