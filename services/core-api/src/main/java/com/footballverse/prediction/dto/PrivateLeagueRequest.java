package com.footballverse.prediction.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record PrivateLeagueRequest(@NotBlank @Size(max = 80) String name) {}
