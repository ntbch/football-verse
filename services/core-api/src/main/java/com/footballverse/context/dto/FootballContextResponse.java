package com.footballverse.context.dto;

import com.footballverse.context.model.FootballContextType;

public record FootballContextResponse(
        Long id,
        FootballContextType type,
        String key,
        String displayName
) {
}
