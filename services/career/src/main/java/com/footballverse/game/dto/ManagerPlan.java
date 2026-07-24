package com.footballverse.game.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ManagerPlan(UUID managerId, String managerName, int adaptability, int risk, List<Integer> checkpoints) {}
