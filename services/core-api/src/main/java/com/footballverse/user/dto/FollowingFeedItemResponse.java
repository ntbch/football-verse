package com.footballverse.user.dto;

import com.footballverse.news.dto.NewsArticleResponse;

import java.util.List;

public record FollowingFeedItemResponse(
        NewsArticleResponse article,
        List<String> reasons
) {}
