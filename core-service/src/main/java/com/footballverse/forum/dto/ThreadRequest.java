package com.footballverse.forum.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ThreadRequest(
        @NotBlank @Size(max = 180) String title,
        @NotBlank String content
) {
}
