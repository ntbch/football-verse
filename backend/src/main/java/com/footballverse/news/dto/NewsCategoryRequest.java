package com.footballverse.news.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NewsCategoryRequest(@NotBlank @Size(max = 100) String name) {
}
