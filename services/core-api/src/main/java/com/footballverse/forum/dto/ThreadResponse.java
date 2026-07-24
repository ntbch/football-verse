package com.footballverse.forum.dto;

import java.time.Instant;

public record ThreadResponse(
        Long id,
        String title,
        String slug,
        String categoryName,
        String categorySlug,
        String authorUsername,
        boolean pinned,
        boolean locked,
        Instant createdAt,
        boolean solved,
        Long bestAnswerPostId,
        boolean followed,
        long replyCount,
        long likes,
        Instant lastActivityAt
) {
}
