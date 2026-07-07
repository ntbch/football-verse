package com.footballverse.search.dto;

import com.footballverse.common.pagination.PageResponse;
import com.footballverse.news.dto.NewsArticleResponse;
import com.footballverse.forum.dto.ThreadResponse;

public record SearchResponse(
    PageResponse<NewsArticleResponse> news,
    PageResponse<ThreadResponse> forum
) {}
