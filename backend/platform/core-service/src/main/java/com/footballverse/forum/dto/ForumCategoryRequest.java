package com.footballverse.forum.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForumCategoryRequest(@NotBlank @Size(max = 100) String name) {
}
