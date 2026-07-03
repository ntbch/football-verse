package com.footballverse.news.dto;

public record NewsSourceResponse(Long id, String name, String feedUrl, boolean active) {
}
