package com.footballverse.prediction.dto;

public record CommunityPredictionDistributionResponse(
        long fixtureId,
        long home,
        long draw,
        long away,
        long total
) {}
