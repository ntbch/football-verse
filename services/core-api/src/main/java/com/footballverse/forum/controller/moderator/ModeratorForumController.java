package com.footballverse.forum.controller.moderator;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.forum.dto.PostResponse;
import com.footballverse.forum.dto.ReportResponse;
import com.footballverse.forum.dto.ThreadResponse;
import com.footballverse.forum.service.ForumPostService;
import com.footballverse.forum.service.ForumReportService;
import com.footballverse.forum.service.ForumThreadService;
import com.footballverse.moderation.dto.ModerationAuditLogResponse;
import com.footballverse.moderation.service.ModerationAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/moderator/forum")
@PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
@RequiredArgsConstructor
public class ModeratorForumController {
    private final ForumThreadService threadService;
    private final ForumPostService postService;
    private final ForumReportService reportService;
    private final ModerationAuditService audit;

    @GetMapping("/reports")
    public ApiResponse<List<ReportResponse>> reports() {
        return ApiResponse.ok(reportService.openReports());
    }

    @PatchMapping("/reports/{id}/resolve")
    public ApiResponse<ReportResponse> resolve(@PathVariable Long id) {
        ReportResponse response = reportService.resolveReport(id);
        audit.record("REPORT_RESOLVED", response.targetType().name(), response.targetId(), null);
        return ApiResponse.ok(response);
    }

    @GetMapping("/audit")
    public ApiResponse<PageResponse<ModerationAuditLogResponse>> audit(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ApiResponse.ok(audit.page(page, size));
    }

    @PatchMapping("/threads/{id}/pin")
    public ApiResponse<ThreadResponse> pin(@PathVariable Long id, @RequestParam boolean value) {
        ThreadResponse response = threadService.pin(id, value);
        audit.record(value ? "THREAD_PINNED" : "THREAD_UNPINNED", "THREAD", id, null);
        return ApiResponse.ok(response);
    }

    @PatchMapping("/threads/{id}/lock")
    public ApiResponse<ThreadResponse> lock(@PathVariable Long id, @RequestParam boolean value) {
        ThreadResponse response = threadService.lock(id, value);
        audit.record(value ? "THREAD_LOCKED" : "THREAD_UNLOCKED", "THREAD", id, null);
        return ApiResponse.ok(response);
    }

    @PatchMapping("/threads/{id}/hide")
    public ApiResponse<ThreadResponse> hide(@PathVariable Long id, @RequestParam boolean value) {
        ThreadResponse response = threadService.hideThread(id, value);
        audit.record(value ? "THREAD_HIDDEN" : "THREAD_UNHIDDEN", "THREAD", id, null);
        return ApiResponse.ok(response);
    }

    @PatchMapping("/posts/{id}/hide")
    public ApiResponse<PostResponse> hidePost(@PathVariable Long id, @RequestParam boolean value) {
        PostResponse response = postService.hidePost(id, value);
        audit.record(value ? "POST_HIDDEN" : "POST_UNHIDDEN", "POST", id, null);
        return ApiResponse.ok(response);
    }
}
