package com.footballverse.news.dto;

import com.footballverse.news.model.NewsSourceType;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;

public record NewsSourceRequest(
        @NotBlank String name,
        @URL String feedUrl,
        NewsSourceType sourceType,
        String cssSelector,
        String provider
) {
}
