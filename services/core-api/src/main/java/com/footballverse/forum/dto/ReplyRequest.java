package com.footballverse.forum.dto;

import jakarta.validation.constraints.NotBlank;

public record ReplyRequest(@NotBlank String content) {
}
