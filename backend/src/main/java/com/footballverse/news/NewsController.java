package com.footballverse.news;

import com.footballverse.common.pagination.PageResponse;
import com.footballverse.common.response.ApiResponse;
import com.footballverse.news.dto.CommentRequest;
import com.footballverse.news.dto.CommentResponse;
import com.footballverse.news.dto.NewsArticleResponse;
import com.footballverse.news.dto.NewsCategoryResponse;
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
import java.util.Map;

@RestController
@RequestMapping("/news")
@RequiredArgsConstructor
public class NewsController {
    private final NewsService newsService;

    @GetMapping
    public ApiResponse<PageResponse<NewsArticleResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(newsService.published(page, size));
    }

    @GetMapping("/{slug}")
    public ApiResponse<NewsArticleResponse> detail(@PathVariable String slug) {
        return ApiResponse.ok(newsService.detail(slug));
    }

    @GetMapping("/{slug}/comments")
    public ApiResponse<List<CommentResponse>> comments(@PathVariable String slug) {
        return ApiResponse.ok(newsService.comments(slug));
    }

    @GetMapping("/categories")
    public ApiResponse<List<NewsCategoryResponse>> categories() {
        return ApiResponse.ok(newsService.categories());
    }

    @PostMapping("/{id}/like")
    public ApiResponse<Map<String, Boolean>> like(@PathVariable Long id) {
        return ApiResponse.ok(Map.of("liked", newsService.like(id)));
    }

    @PostMapping("/{id}/bookmark")
    public ApiResponse<Map<String, Boolean>> bookmark(@PathVariable Long id) {
        return ApiResponse.ok(Map.of("bookmarked", newsService.bookmark(id)));
    }

    @PostMapping("/{id}/comments")
    public ApiResponse<CommentResponse> comment(@PathVariable Long id, @Valid @RequestBody CommentRequest request) {
        return ApiResponse.ok(newsService.comment(id, request));
    }
}
