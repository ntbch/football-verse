package com.footballverse.controller.moderator;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.forum.ForumPostRepository;
import com.footballverse.forum.ForumReportRepository;
import com.footballverse.forum.ForumReportStatus;
import com.footballverse.forum.ForumThreadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/moderator/dashboard")
@PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
@RequiredArgsConstructor
public class ModeratorDashboardController {
    private final ForumReportRepository reportRepository;
    private final ForumThreadRepository threadRepository;
    private final ForumPostRepository postRepository;

    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> getStats() {
        return ApiResponse.ok(Map.of(
            "pendingReports", reportRepository.countByStatus(ForumReportStatus.OPEN),
            "resolvedReports", reportRepository.countByStatus(ForumReportStatus.RESOLVED),
            "hiddenThreads", threadRepository.countByHiddenTrue(),
            "hiddenPosts", postRepository.countByHiddenTrue()
        ));
    }
}
