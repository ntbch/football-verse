package com.footballverse.news.dto;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;

public record NewsSourceRequest(@NotBlank String name, @URL @NotBlank String feedUrl) {
}
