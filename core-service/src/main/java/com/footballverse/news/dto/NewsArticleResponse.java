package com.footballverse.news.dto;

import com.footballverse.news.model.ArticleStatus;

import java.time.Instant;
import java.util.Set;

public record NewsArticleResponse(
        Long id,
        String title,
        String slug,
        String summary,
        String content,
        ArticleStatus status,
        String category,
        Set<String> tags,
        long likes,
        long bookmarks,
        Instant publishedAt,
        Boolean liked,
        Boolean bookmarked
) {
}
