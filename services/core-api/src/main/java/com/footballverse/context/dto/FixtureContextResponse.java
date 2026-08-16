package com.footballverse.context.dto;

import java.util.List;

public record FixtureContextResponse(
        FootballContextResponse context,
        List<ContextualNewsResponse> news,
        List<ContextualThreadResponse> threads
) {
}
