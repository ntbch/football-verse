package com.footballverse.news.dto;

import java.time.Instant;

public record InternalArticleImportRequest(
    String title,
    String sourceUrl,
    Long sourceId,
    String summary,
    String content,
    Instant publishedAt,
    String imageUrl
) {}
