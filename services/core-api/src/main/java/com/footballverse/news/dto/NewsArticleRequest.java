package com.footballverse.news.dto;

import com.footballverse.news.model.ArticleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record NewsArticleRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 500) String summary,
        @NotBlank String content,
        @Size(max = 2048) @Pattern(regexp = "^https?://.+$", message = "Image URL must use HTTP or HTTPS") String imageUrl,
        Long categoryId,
        Set<String> tags,
        ArticleStatus status
) {
}
