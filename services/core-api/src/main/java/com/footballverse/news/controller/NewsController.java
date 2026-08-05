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
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;
import java.util.Map;
import java.time.Duration;

@RestController
@RequestMapping("/news")
@RequiredArgsConstructor
@Validated
public class NewsController {
    private final NewsArticleService articleService;
    private final NewsCommentService commentService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<NewsArticleResponse>>> list(
            @RequestParam(required = false) List<Long> categories,
            @RequestParam(required = false) List<Long> tags,
            @RequestParam(required = false) String provider,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
    ) {
        return ResponseEntity.ok()
                .cacheControl(cacheControl(authorization, Duration.ofMinutes(1)))
                .header(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION)
                .body(ApiResponse.ok(articleService.published(categories, tags, provider, page, size)));
    }

    @GetMapping("/trending")
    public ResponseEntity<ApiResponse<PageResponse<NewsArticleResponse>>> trending(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
    ) {
        return ResponseEntity.ok()
                .cacheControl(cacheControl(authorization, Duration.ofMinutes(1)))
                .header(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION)
                .body(ApiResponse.ok(articleService.trending(page, size)));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<NewsArticleResponse>> detail(
            @PathVariable String slug,
            @RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
    ) {
        NewsArticleResponse article = articleService.detail(slug);
        String etag = "\"" + Integer.toHexString(article.hashCode()) + "\"";
        CacheControl cacheControl = cacheControl(authorization, Duration.ofMinutes(5));
        if (ifNoneMatch != null && ifNoneMatch.contains(etag)) {
            return ResponseEntity.status(304).eTag(etag).cacheControl(cacheControl).header(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION).build();
        }
        return ResponseEntity.ok().eTag(etag).cacheControl(cacheControl).header(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION).body(ApiResponse.ok(article));
    }

    @GetMapping("/{slug}/comments")
    public ApiResponse<List<CommentResponse>> comments(@PathVariable String slug) {
        return ApiResponse.ok(commentService.comments(slug));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<NewsCategoryResponse>>> categories() {
        return ResponseEntity.ok().cacheControl(cacheControl(null, Duration.ofMinutes(5))).body(ApiResponse.ok(articleService.categories()));
    }

    @GetMapping("/tags")
    public ResponseEntity<ApiResponse<List<NewsTagResponse>>> tags() {
        return ResponseEntity.ok().cacheControl(cacheControl(null, Duration.ofMinutes(5))).body(ApiResponse.ok(articleService.tags()));
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

    private static CacheControl cacheControl(String authorization, Duration maxAge) {
        if (authorization != null && !authorization.isBlank()) return CacheControl.noCache().cachePrivate();
        return CacheControl.maxAge(maxAge)
                .sMaxAge(maxAge)
                .cachePublic()
                .staleWhileRevalidate(Duration.ofMinutes(5));
    }
}
