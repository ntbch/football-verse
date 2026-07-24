package com.footballverse.news.dto;

import com.footballverse.news.model.NewsSourceType;

public record NewsSourceResponse(
        Long id,
        String name,
        String feedUrl,
        boolean active,
        boolean autoPublish,
        NewsSourceType sourceType,
        String cssSelector,
        String provider,
        String publisherName
) {
}
