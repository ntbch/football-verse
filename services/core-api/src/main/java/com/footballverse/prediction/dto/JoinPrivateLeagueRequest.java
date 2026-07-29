package com.footballverse.prediction.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record JoinPrivateLeagueRequest(@NotBlank @Size(max = 8) String inviteCode) {}
