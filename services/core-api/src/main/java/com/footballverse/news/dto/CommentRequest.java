package com.footballverse.news.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentRequest(Long parentId, @NotBlank @Size(max = 2000) String content) {
}
