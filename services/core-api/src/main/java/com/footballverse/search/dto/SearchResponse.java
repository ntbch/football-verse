package com.footballverse.search.dto;

import com.footballverse.common.pagination.PageResponse;
import com.footballverse.forum.dto.ThreadResponse;

public record SearchResponse(
    PageResponse<SearchArticleSummaryResponse> news,
    PageResponse<ThreadResponse> forum
) {}
