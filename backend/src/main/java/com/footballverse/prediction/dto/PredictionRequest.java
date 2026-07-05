package com.footballverse.prediction.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PredictionRequest(
        @NotBlank @Pattern(regexp = "home|draw|away") String pick,
        @Min(0) @Max(99) Integer homeScore,
        @Min(0) @Max(99) Integer awayScore,
        String pickOu25,
        String pickBtts
) {}