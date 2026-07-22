package com.footballverse.prediction.dto;

import java.util.List;

public record MatchCentreResponse(
        String league,
        String round,
        List<MatchCentreFixture> fixtures,
        List<StandingResponse> standings,
        List<String> rounds,
        String currentRound
) {}