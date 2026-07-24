package com.footballverse.news.dto;

public record ArticleImportResponse(
    String status, // ACCEPTED, EXISTS, REJECTED
    String message
) {}
