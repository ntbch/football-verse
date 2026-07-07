package com.footballverse.news;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.crawl.CrawlService;
import com.footballverse.news.dto.InternalArticleImportRequest;
import com.footballverse.news.dto.NewsSourceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
@Slf4j
public class InternalNewsController {

    private final NewsSourceRepository sources;
    private final CrawlService crawlService;

    @Value("${app.internal.token:dev-internal-token}")
    private String internalToken;

    private boolean checkToken(String tokenHeader) {
        return internalToken.equals(tokenHeader);
    }

    @GetMapping("/news-sources")
    public ResponseEntity<?> getActiveSources(@RequestHeader(value = "X-Internal-Token", required = false) String token) {
        if (!checkToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized: Invalid internal token"));
        }
        
        List<NewsSourceResponse> activeSources = sources.findByActiveTrue().stream()
                .map(source -> new NewsSourceResponse(
                        source.getId(),
                        source.getName(),
                        source.getFeedUrl(),
                        source.isActive(),
                        source.getSourceType(),
                        source.getCssSelector()
                ))
                .toList();
                
        return ResponseEntity.ok(ApiResponse.ok(activeSources));
    }

    @GetMapping("/news/check-status")
    public ResponseEntity<?> checkArticleStatus(
            @RequestHeader(value = "X-Internal-Token", required = false) String token,
            @org.springframework.web.bind.annotation.RequestParam("url") String url
    ) {
        if (!checkToken(token)) {
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
        if (!checkToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized: Invalid internal token"));
        }
        
        try {
            boolean imported = crawlService.importArticle(request);
            if (imported) {
                return ResponseEntity.ok(ApiResponse.ok("Import successful"));
            } else {
                return ResponseEntity.ok(ApiResponse.ok("Import skipped: Article already exists or is not football related"));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Internal import error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Internal server error: " + e.getMessage()));
        }
    }
}
