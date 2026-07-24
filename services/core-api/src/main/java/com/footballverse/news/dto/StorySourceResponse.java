package com.footballverse.news.dto;

import java.time.Instant;

public record StorySourceResponse(
        String name,
        String url,
        Instant publishedAt,
        boolean primary
) {
}
