package com.footballverse.news;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.news.dto.ArticleStatusRequest;
import com.footballverse.news.dto.NewsArticleRequest;
import com.footballverse.news.dto.NewsArticleResponse;
import com.footballverse.news.dto.NewsCategoryRequest;
import com.footballverse.news.dto.NewsCategoryResponse;
import com.footballverse.news.dto.NewsSourceRequest;
import com.footballverse.news.dto.NewsSourceResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/news")
@RequiredArgsConstructor
public class AdminNewsController {
    private final NewsService newsService;

    @GetMapping
    public ApiResponse<PageResponse<NewsArticleResponse>> articles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(newsService.adminArticles(page, size));
    }

    @PostMapping
    public ApiResponse<NewsArticleResponse> create(@Valid @RequestBody NewsArticleRequest request) {
        return ApiResponse.ok(newsService.createArticle(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<NewsArticleResponse> detail(@PathVariable Long id) {
        return ApiResponse.ok(newsService.adminDetail(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<NewsArticleResponse> update(@PathVariable Long id, @Valid @RequestBody NewsArticleRequest request) {
        return ApiResponse.ok(newsService.updateArticle(id, request));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<NewsArticleResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody ArticleStatusRequest request
    ) {
        return ApiResponse.ok(newsService.updateStatus(id, request.status()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Map<String, Boolean>> delete(@PathVariable Long id) {
        newsService.deleteArticle(id);
        return ApiResponse.ok(Map.of("deleted", true));
    }

    @GetMapping("/categories")
    public ApiResponse<List<NewsCategoryResponse>> categories() {
        return ApiResponse.ok(newsService.categories());
    }

    @PostMapping("/categories")
    public ApiResponse<NewsCategoryResponse> createCategory(@Valid @RequestBody NewsCategoryRequest request) {
        return ApiResponse.ok(newsService.createCategory(request));
    }

    @GetMapping("/sources")
    public ApiResponse<List<NewsSourceResponse>> sources() {
        return ApiResponse.ok(newsService.sources());
    }

    @PostMapping("/sources")
    public ApiResponse<NewsSourceResponse> createSource(@Valid @RequestBody NewsSourceRequest request) {
        return ApiResponse.ok(newsService.createSource(request));
    }

    @PostMapping("/crawl")
    public ApiResponse<Map<String, Integer>> crawl() {
        return ApiResponse.ok(Map.of("saved", newsService.crawl()));
    }
}
