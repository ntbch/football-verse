package com.footballverse.prediction.dto;

import java.util.List;

public record LineupResponse(
        String coverage,
        String sourceUpdatedAt,
        String fetchedAt,
        List<LineupTeamResponse> teams
) {}
