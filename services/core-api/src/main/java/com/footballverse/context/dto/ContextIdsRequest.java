package com.footballverse.context.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ContextIdsRequest(
        @NotNull List<@NotNull Long> contextIds
) {
}
