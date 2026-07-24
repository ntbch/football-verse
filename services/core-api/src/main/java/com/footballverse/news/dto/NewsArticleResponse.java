package com.footballverse.news.dto;

import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsContentKind;
import com.footballverse.news.model.VerificationStatus;

import java.time.Instant;
import java.util.List;
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
        Boolean bookmarked,
        NewsContentKind contentKind,
        String imageUrl,
        String mediaType,
        VerificationStatus verificationStatus,
        String sourceName,
        String sourceUrl,
        int sourceCount,
        List<StorySourceResponse> sources,
        List<StoryKeyPointResponse> keyPoints
) {
}
