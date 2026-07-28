package com.footballverse.prediction.dto;

import java.util.List;

public record LineupTeamResponse(
        String teamId,
        String teamName,
        String teamLogo,
        String formation,
        List<LineupPlayerResponse> startingXI,
        List<LineupPlayerResponse> substitutes
) {}
