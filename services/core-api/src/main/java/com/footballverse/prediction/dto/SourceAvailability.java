package com.footballverse.prediction.dto;

public record SourceAvailability(
        String state,
        String provider,
        String season,
        String fetchedAt,
        String sourceUpdatedAt,
        Integer retryAfterSeconds
) {
}
