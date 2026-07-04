package com.footballverse.forum.dto;

import java.time.Instant;

public record ThreadResponse(
        Long id,
        String title,
        String slug,
        String category,
        String author,
        boolean pinned,
        boolean locked,
        Instant createdAt,
        boolean solved,
        Long bestAnswerPostId,
        boolean followed,
        long replyCount,
        Instant lastActivityAt
) {
}
