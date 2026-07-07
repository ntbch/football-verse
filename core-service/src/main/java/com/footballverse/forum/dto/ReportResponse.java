package com.footballverse.forum.dto;

import com.footballverse.forum.ForumReportStatus;
import com.footballverse.forum.ForumReportTarget;

public record ReportResponse(
        Long id,
        ForumReportTarget targetType,
        Long targetId,
        String reporter,
        String reason,
        ForumReportStatus status
) {
}
