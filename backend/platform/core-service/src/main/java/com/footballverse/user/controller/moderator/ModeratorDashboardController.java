package com.footballverse.user.controller.moderator;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.forum.repository.ForumPostRepository;
import com.footballverse.forum.repository.ForumReportRepository;
import com.footballverse.forum.model.ForumReportStatus;
import com.footballverse.forum.repository.ForumThreadRepository;
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
