package com.footballverse.news.controller;
import com.footballverse.news.service.NewsArticleService;
import com.footballverse.news.service.NewsCommentService;

import com.footballverse.common.pagination.PageResponse;
import com.footballverse.common.response.ApiResponse;
import com.footballverse.news.dto.CommentRequest;
import com.footballverse.news.dto.CommentResponse;
import com.footballverse.news.dto.NewsArticleResponse;
import com.footballverse.news.dto.NewsCategoryResponse;
import com.footballverse.news.dto.NewsTagResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
@RequestMapping("/news")
@RequiredArgsConstructor
public class NewsController {
    private final NewsArticleService articleService;
    private final NewsCommentService commentService;

    @GetMapping
    public ApiResponse<PageResponse<NewsArticleResponse>> list(
            @RequestParam(required = false) List<Long> categories,
            @RequestParam(required = false) List<Long> tags,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(articleService.published(categories, tags, page, size));
    }

    @GetMapping("/{slug}")
    public ApiResponse<NewsArticleResponse> detail(@PathVariable String slug) {
        return ApiResponse.ok(articleService.detail(slug));
    }

    @GetMapping("/{slug}/comments")
    public ApiResponse<List<CommentResponse>> comments(@PathVariable String slug) {
        return ApiResponse.ok(commentService.comments(slug));
    }

    @GetMapping("/categories")
    public ApiResponse<List<NewsCategoryResponse>> categories() {
        return ApiResponse.ok(articleService.categories());
    }

    @GetMapping("/tags")
    public ApiResponse<List<NewsTagResponse>> tags() {
        return ApiResponse.ok(articleService.tags());
    }

    @PostMapping("/{id}/like")
    public ApiResponse<Map<String, Boolean>> like(@PathVariable Long id) {
        return ApiResponse.ok(Map.of("liked", commentService.like(id)));
    }

    @PostMapping("/{id}/bookmark")
    public ApiResponse<Map<String, Boolean>> bookmark(@PathVariable Long id) {
        return ApiResponse.ok(Map.of("bookmarked", commentService.bookmark(id)));
    }

    @PostMapping("/comments/{id}/like")
    public ApiResponse<Map<String, Boolean>> likeComment(@PathVariable Long id) {
        return ApiResponse.ok(Map.of("liked", commentService.toggleLikeComment(id)));
    }

    @PostMapping("/{id}/comments")
    public ApiResponse<CommentResponse> comment(@PathVariable Long id, @Valid @RequestBody CommentRequest request) {
        return ApiResponse.ok(commentService.comment(id, request));
    }
}
