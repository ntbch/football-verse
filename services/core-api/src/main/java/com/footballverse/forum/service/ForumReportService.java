package com.footballverse.forum.service;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.text.RichTextSanitizer;
import com.footballverse.forum.dto.ReportRequest;
import com.footballverse.forum.dto.ReportResponse;
import com.footballverse.forum.model.ForumReport;
import com.footballverse.forum.model.ForumReportStatus;
import com.footballverse.forum.model.ForumReportTarget;
import com.footballverse.forum.repository.ForumPostRepository;
import com.footballverse.forum.repository.ForumReportRepository;
import com.footballverse.forum.repository.ForumThreadRepository;
import com.footballverse.notification.model.NotificationType;
import com.footballverse.notification.service.NotificationService;
import com.footballverse.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ForumReportService {

    private final ForumThreadRepository threads;
    private final ForumPostRepository posts;
    private final ForumReportRepository reports;
    private final RichTextSanitizer sanitizer;
    private final CurrentUser currentUser;
    private final NotificationService notifications;

    @Transactional
    public ReportResponse report(ReportRequest request) {
        validateReportTarget(request.targetType(), request.targetId());
        ForumReport report = new ForumReport();
        report.setReporter(currentUser.get());
        report.setTargetType(request.targetType());
        report.setTargetId(request.targetId());
        report.setReason(sanitizer.sanitize(request.reason()));
        return toReport(reports.save(report));
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> openReports() {
        return reports.findByStatusOrderByCreatedAtDesc(ForumReportStatus.OPEN).stream().map(this::toReport).toList();
    }

    @Transactional
    public ReportResponse resolveReport(Long id) {
        ForumReport report = reports.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found"));
        report.setStatus(ForumReportStatus.RESOLVED);
        notifications.create(report.getReporter(), NotificationType.REPORT_RESOLVED, "Your report was resolved", reportLink(report));
        return toReport(report);
    }

    private void validateReportTarget(ForumReportTarget targetType, Long targetId) {
        boolean exists = switch (targetType) {
            case THREAD -> threads.existsById(targetId);
            case POST -> posts.existsById(targetId);
        };
        if (!exists) {
            throw new ResourceNotFoundException(targetType == ForumReportTarget.THREAD ? "Thread not found" : "Post not found");
        }
    }

    private String reportLink(ForumReport report) {
        return switch (report.getTargetType()) {
            case THREAD -> threads.findById(report.getTargetId())
                    .map(thread -> "/forum/threads/" + thread.getSlug())
                    .orElse("/profile");
            case POST -> posts.findById(report.getTargetId())
                    .map(post -> "/forum/threads/" + post.getThread().getSlug())
                    .orElse("/profile");
        };
    }

    private ReportResponse toReport(ForumReport report) {
        return new ReportResponse(
                report.getId(),
                report.getTargetType(),
                report.getTargetId(),
                report.getReporter().getUsername(),
                report.getReason(),
                report.getStatus()
        );
    }
}
