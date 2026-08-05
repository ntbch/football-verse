package com.footballverse.news.controller;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.news.dto.InternalArticleImportRequest;
import com.footballverse.news.dto.NormalizedItemImportRequest;
import com.footballverse.news.dto.NewsSourceResponse;
import com.footballverse.news.repository.NewsSourceRepository;
import com.footballverse.news.service.CrawlService;
import com.footballverse.news.service.RawItemImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
@Slf4j
public class InternalNewsController {

    private final NewsSourceRepository sources;
    private final CrawlService crawlService;
    private final RawItemImportService rawItemImportService;

    @GetMapping("/news-sources")
    public ResponseEntity<?> getActiveSources() {
        List<NewsSourceResponse> activeSources = sources.findByActiveTrue().stream()
                .map(source -> new NewsSourceResponse(
                        source.getId(),
                        source.getName(),
                        source.getFeedUrl(),
                        source.isActive(),
                        source.isAutoPublish(),
                        source.getSourceType(),
                        source.getCssSelector(),
                        source.getProvider(),
                        source.getName(),
                        source.getFetchIntervalSeconds()
                ))
                .toList();
                
        return ResponseEntity.ok(ApiResponse.ok(activeSources));
    }

    @GetMapping("/news/check-status")
    public ResponseEntity<?> checkArticleStatus(
            @RequestParam("url") String url
    ) {
        return ResponseEntity.ok(ApiResponse.ok(crawlService.checkStatus(url)));
    }

    @PostMapping("/news/import")
    public ResponseEntity<?> importArticle(
            @RequestBody InternalArticleImportRequest request
    ) {
        try {
            var result = crawlService.importArticle(request);
            return ResponseEntity.ok(ApiResponse.ok(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Import rejected"));
        } catch (Exception e) {
            log.error("Internal article import failed; type={}", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Internal import failed"));
        }
    }

    @PostMapping("/news/raw-items")
    public ResponseEntity<?> importRawItem(
            @Valid @RequestBody NormalizedItemImportRequest request
    ) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(rawItemImportService.importItem(request)));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Raw item rejected"));
        } catch (Exception exception) {
            log.error("Internal raw item import failed; type={}", exception.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Internal import failed"));
        }
    }
}
