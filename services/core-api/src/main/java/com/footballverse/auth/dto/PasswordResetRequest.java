package com.footballverse.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 8, max = 100) String password
) {
}
