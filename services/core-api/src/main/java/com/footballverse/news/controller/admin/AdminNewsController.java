package com.footballverse.news.controller.admin;
import com.footballverse.news.model.ArticleStatus;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.news.service.CrawlService;
import com.footballverse.news.service.NewsArticleService;
import com.footballverse.news.service.NewsSourceService;
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
    private final NewsArticleService articleService;
    private final NewsSourceService sourceService;
    private final CrawlService crawlService;

    @GetMapping
    public ApiResponse<PageResponse<NewsArticleResponse>> articles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) com.footballverse.news.model.ArticleStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        return ApiResponse.ok(articleService.adminArticles(page, size, status, search, categoryId, startDate, endDate));
    }

    @GetMapping("/meta/counts")
    public ApiResponse<java.util.Map<String, Long>> counts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        return ApiResponse.ok(articleService.adminCounts(search, categoryId, startDate, endDate));
    }

    @PostMapping
    public ApiResponse<NewsArticleResponse> create(@Valid @RequestBody NewsArticleRequest request) {
        return ApiResponse.ok(articleService.createArticle(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<NewsArticleResponse> detail(@PathVariable Long id) {
        return ApiResponse.ok(articleService.adminDetail(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<NewsArticleResponse> update(@PathVariable Long id, @Valid @RequestBody NewsArticleRequest request) {
        return ApiResponse.ok(articleService.updateArticle(id, request));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<NewsArticleResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody ArticleStatusRequest request
    ) {
        return ApiResponse.ok(articleService.updateStatus(id, request.status()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Map<String, Boolean>> delete(@PathVariable Long id) {
        articleService.deleteArticle(id);
        return ApiResponse.ok(Map.of("deleted", true));
    }

    @GetMapping("/categories")
    public ApiResponse<List<NewsCategoryResponse>> categories() {
        return ApiResponse.ok(articleService.categories());
    }

    @PostMapping("/categories")
    public ApiResponse<NewsCategoryResponse> createCategory(@Valid @RequestBody NewsCategoryRequest request) {
        return ApiResponse.ok(articleService.createCategory(request));
    }

    @GetMapping("/sources")
    public ApiResponse<List<NewsSourceResponse>> sources() {
        return ApiResponse.ok(sourceService.sources());
    }

    @PostMapping("/sources")
    public ApiResponse<NewsSourceResponse> createSource(@Valid @RequestBody NewsSourceRequest request) {
        return ApiResponse.ok(sourceService.createSource(request));
    }

    @DeleteMapping("/sources/{id}")
    public ApiResponse<Map<String, Boolean>> deleteSource(@PathVariable Long id) {
        boolean deleted = sourceService.deleteSource(id);
        return ApiResponse.ok(Map.of("deleted", deleted, "deactivated", !deleted));
    }

    @PatchMapping("/sources/{id}/toggle")
    public ApiResponse<NewsSourceResponse> toggleSource(@PathVariable Long id) {
        return ApiResponse.ok(sourceService.toggleSource(id));
    }

    @PatchMapping("/sources/{id}/auto-publish")
    public ApiResponse<NewsSourceResponse> toggleAutoPublish(@PathVariable Long id) {
        return ApiResponse.ok(sourceService.toggleAutoPublish(id));
    }

    @PostMapping("/crawl")
    public ApiResponse<CrawlService.CrawlResult> crawl() {
        return ApiResponse.ok(crawlService.crawl(true));
    }
}
