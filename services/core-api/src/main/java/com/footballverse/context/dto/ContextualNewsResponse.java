package com.footballverse.context.dto;

import java.time.Instant;

public record ContextualNewsResponse(
        String title,
        String slug,
        String summary,
        String imageUrl,
        Instant publishedAt
) {
}
