package com.footballverse.forum.dto;

import com.footballverse.forum.model.ForumReportStatus;
import com.footballverse.forum.model.ForumReportTarget;

public record ReportResponse(
        Long id,
        ForumReportTarget targetType,
        Long targetId,
        String reporter,
        String reason,
        ForumReportStatus status
) {
}
