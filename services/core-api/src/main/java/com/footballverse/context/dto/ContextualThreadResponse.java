package com.footballverse.context.dto;

import java.time.Instant;

public record ContextualThreadResponse(
        String title,
        String slug,
        String category,
        Instant lastActivityAt
) {
}
