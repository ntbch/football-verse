package com.footballverse.news.controller;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.news.dto.InternalArticleImportRequest;
import com.footballverse.news.dto.NormalizedItemImportRequest;
import com.footballverse.news.dto.NewsSourceResponse;
import com.footballverse.news.repository.NewsSourceRepository;
import com.footballverse.news.service.CrawlService;
import com.footballverse.news.service.RawItemImportService;
import com.footballverse.security.InternalTokenVerifier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
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
    private final InternalTokenVerifier internalTokenVerifier;

    @GetMapping("/news-sources")
    public ResponseEntity<?> getActiveSources(@RequestHeader(value = "X-Internal-Token", required = false) String token) {
        if (!internalTokenVerifier.matches(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized: Invalid internal token"));
        }
        
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
                        source.getName()
                ))
                .toList();
                
        return ResponseEntity.ok(ApiResponse.ok(activeSources));
    }

    @GetMapping("/news/check-status")
    public ResponseEntity<?> checkArticleStatus(
            @RequestHeader(value = "X-Internal-Token", required = false) String token,
            @RequestParam("url") String url
    ) {
        if (!internalTokenVerifier.matches(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized: Invalid internal token"));
        }
        
        return ResponseEntity.ok(ApiResponse.ok(crawlService.checkStatus(url)));
    }

    @PostMapping("/news/import")
    public ResponseEntity<?> importArticle(
            @RequestHeader(value = "X-Internal-Token", required = false) String token,
            @RequestBody InternalArticleImportRequest request
    ) {
        if (!internalTokenVerifier.matches(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized: Invalid internal token"));
        }
        
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
            @RequestHeader(value = "X-Internal-Token", required = false) String token,
            @Valid @RequestBody NormalizedItemImportRequest request
    ) {
        if (!internalTokenVerifier.matches(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized: Invalid internal token"));
        }

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
