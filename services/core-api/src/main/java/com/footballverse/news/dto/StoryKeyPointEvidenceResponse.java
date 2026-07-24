package com.footballverse.news.dto;

import java.time.Instant;

public record StoryKeyPointEvidenceResponse(
        String sourceName,
        String originalUrl,
        Instant publishedAt,
        String relation
) {
}
