package com.footballverse.forum.dto;

import com.footballverse.forum.ForumReportTarget;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReportRequest(
        @NotNull ForumReportTarget targetType,
        @NotNull Long targetId,
        @NotBlank @Size(max = 500) String reason
) {
}
