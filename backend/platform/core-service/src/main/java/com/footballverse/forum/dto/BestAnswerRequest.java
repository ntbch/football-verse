package com.footballverse.forum.dto;

import jakarta.validation.constraints.NotNull;

public record BestAnswerRequest(@NotNull Long postId) {
}
