package com.footballverse.context.dto;

import java.util.List;

public record ContextAssignmentResponse(
        Long resourceId,
        List<Long> contextIds
) {
}
