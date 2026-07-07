package com.footballverse.forum;

import com.footballverse.common.pagination.PageResponse;
import com.footballverse.common.response.ApiResponse;
import com.footballverse.forum.dto.BestAnswerRequest;
import com.footballverse.forum.dto.ForumCategoryResponse;
import com.footballverse.forum.dto.PostResponse;
import com.footballverse.forum.dto.ReplyRequest;
import com.footballverse.forum.dto.ReportRequest;
import com.footballverse.forum.dto.ReportResponse;
import com.footballverse.forum.dto.ThreadDetailResponse;
import com.footballverse.forum.dto.ThreadRequest;
import com.footballverse.forum.dto.ThreadResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/forum")
@RequiredArgsConstructor
public class ForumController {
    private final ForumService forumService;

    @GetMapping("/categories")
    public ApiResponse<List<ForumCategoryResponse>> categories() {
        return ApiResponse.ok(forumService.categories());
    }

    @GetMapping("/categories/{slug}/threads")
    public ApiResponse<PageResponse<ThreadResponse>> threads(
            @PathVariable String slug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "latest") String sort
    ) {
        return ApiResponse.ok(forumService.threads(slug, page, size, sort));
    }

    @PostMapping("/categories/{slug}/threads")
    public ApiResponse<ThreadResponse> createThread(@PathVariable String slug, @Valid @RequestBody ThreadRequest request) {
        return ApiResponse.ok(forumService.createThread(slug, request));
    }

    @GetMapping("/threads/{slug}")
    public ApiResponse<ThreadDetailResponse> thread(@PathVariable String slug) {
        return ApiResponse.ok(forumService.thread(slug));
    }

    @PostMapping("/threads/{id}/replies")
    public ApiResponse<PostResponse> reply(@PathVariable Long id, @Valid @RequestBody ReplyRequest request) {
        return ApiResponse.ok(forumService.reply(id, request));
    }

    @PostMapping("/threads/{id}/follow")
    public ApiResponse<Map<String, Boolean>> follow(@PathVariable Long id) {
        return ApiResponse.ok(Map.of("followed", forumService.toggleFollow(id)));
    }

    @PostMapping("/threads/{id}/best-answer")
    public ApiResponse<ThreadResponse> markBestAnswer(@PathVariable Long id, @Valid @RequestBody BestAnswerRequest request) {
        return ApiResponse.ok(forumService.markBestAnswer(id, request.postId()));
    }

    @DeleteMapping("/threads/{id}/best-answer")
    public ApiResponse<ThreadResponse> clearBestAnswer(@PathVariable Long id) {
        return ApiResponse.ok(forumService.clearBestAnswer(id));
    }

    @PostMapping("/reports")
    public ApiResponse<ReportResponse> report(@Valid @RequestBody ReportRequest request) {
        return ApiResponse.ok(forumService.report(request));
    }

    @PostMapping("/posts/{id}/like")
    public ApiResponse<Map<String, Boolean>> likePost(@PathVariable Long id) {
        return ApiResponse.ok(Map.of("liked", forumService.toggleLikePost(id)));
    }
}
