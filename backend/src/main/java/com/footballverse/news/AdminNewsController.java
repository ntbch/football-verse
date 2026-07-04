package com.footballverse.news;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.crawl.CrawlService;
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
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(articleService.adminArticles(page, size));
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
        sourceService.deleteSource(id);
        return ApiResponse.ok(Map.of("deleted", true));
    }

    @PatchMapping("/sources/{id}/toggle")
    public ApiResponse<NewsSourceResponse> toggleSource(@PathVariable Long id) {
        return ApiResponse.ok(sourceService.toggleSource(id));
    }

    @PostMapping("/crawl")
    public ApiResponse<CrawlService.CrawlResult> crawl() {
        return ApiResponse.ok(crawlService.crawl(true));
    }
}
