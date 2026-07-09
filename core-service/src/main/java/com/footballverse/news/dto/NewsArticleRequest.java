package com.footballverse.news.dto;

import com.footballverse.news.model.ArticleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record NewsArticleRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 500) String summary,
        @NotBlank String content,
        Long categoryId,
        Set<String> tags,
        ArticleStatus status
) {
}
