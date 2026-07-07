package com.footballverse.news.dto;

import com.footballverse.news.NewsSourceType;

public record NewsSourceResponse(Long id, String name, String feedUrl, boolean active, NewsSourceType sourceType, String cssSelector) {
}
