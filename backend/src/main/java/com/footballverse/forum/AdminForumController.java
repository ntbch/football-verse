package com.footballverse.forum;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.forum.dto.ForumCategoryRequest;
import com.footballverse.forum.dto.ForumCategoryResponse;
import com.footballverse.forum.dto.ReportResponse;
import com.footballverse.forum.dto.ThreadResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/forum")
@RequiredArgsConstructor
public class AdminForumController {
    private final ForumService forumService;

    @PostMapping("/categories")
    public ApiResponse<ForumCategoryResponse> createCategory(@Valid @RequestBody ForumCategoryRequest request) {
        return ApiResponse.ok(forumService.createCategory(request));
    }

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
}
