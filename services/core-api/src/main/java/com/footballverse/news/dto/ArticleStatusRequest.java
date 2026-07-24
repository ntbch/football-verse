package com.footballverse.news.dto;

import com.footballverse.news.model.ArticleStatus;
import jakarta.validation.constraints.NotNull;

public record ArticleStatusRequest(@NotNull ArticleStatus status) {
}
