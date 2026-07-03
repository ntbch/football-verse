package com.footballverse.user.dto;

import jakarta.validation.constraints.Size;

public record ProfileRequest(
        @Size(max = 80) String displayName,
        String avatarUrl,
        @Size(max = 500) String bio
) {
}
