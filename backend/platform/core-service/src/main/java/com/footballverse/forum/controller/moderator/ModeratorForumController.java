package com.footballverse.forum.controller.moderator;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.forum.service.ForumService;
import com.footballverse.forum.dto.PostResponse;
import com.footballverse.forum.dto.ReportResponse;
import com.footballverse.forum.dto.ThreadResponse;
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
    private final ForumService forumService;

    @GetMapping("/reports")
    public ApiResponse<List<ReportResponse>> reports() {
        return ApiResponse.ok(forumService.openReports());
    }

    @PatchMapping("/reports/{id}/resolve")
    public ApiResponse<ReportResponse> resolve(@PathVariable Long id) {
        return ApiResponse.ok(forumService.resolveReport(id));
    }

    @PatchMapping("/threads/{id}/pin")
    public ApiResponse<ThreadResponse> pin(@PathVariable Long id, @RequestParam boolean value) {
        return ApiResponse.ok(forumService.pin(id, value));
    }

    @PatchMapping("/threads/{id}/lock")
    public ApiResponse<ThreadResponse> lock(@PathVariable Long id, @RequestParam boolean value) {
        return ApiResponse.ok(forumService.lock(id, value));
    }

    @PatchMapping("/threads/{id}/hide")
    public ApiResponse<ThreadResponse> hide(@PathVariable Long id, @RequestParam boolean value) {
        return ApiResponse.ok(forumService.hideThread(id, value));
    }

    @PatchMapping("/posts/{id}/hide")
    public ApiResponse<PostResponse> hidePost(@PathVariable Long id, @RequestParam boolean value) {
        return ApiResponse.ok(forumService.hidePost(id, value));
    }
}
