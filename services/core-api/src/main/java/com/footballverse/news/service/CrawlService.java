package com.footballverse.news.service;

import com.footballverse.common.text.RichTextSanitizer;
import com.footballverse.common.text.SlugUtil;
import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.news.model.NewsCategory;
import com.footballverse.news.repository.NewsCategoryRepository;
import com.footballverse.news.model.NewsSource;
import com.footballverse.news.repository.NewsSourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CrawlService {

    public record CrawlResult(boolean accepted, int saved, int repaired, int skipped, int failed) {}

    private final NewsArticleRepository articles;
    private final NewsSourceRepository sources;
    private final NewsCategoryRepository categoryRepository;
    private final RichTextSanitizer sanitizer;

    @Value("${app.internal.token}")
    private String internalToken;

    @Value("${app.content-ingestion.url:http://content-ingestion:8085}")
    private String contentIngestionUrl;

    @PostConstruct
    public void init() {
        if (internalToken == null || internalToken.trim().isEmpty()) {
            throw new IllegalArgumentException("FATAL: app.internal.token configuration is missing or empty!");
        }
    }

    @Transactional
    public CrawlResult crawl() {
        return crawl(false);
    }

    @Transactional
    public CrawlResult crawl(boolean force) {
        log.info("Triggering content synchronization at {}...", contentIngestionUrl);
        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(contentIngestionUrl + "/crawl"))
                    .POST(java.net.http.HttpRequest.BodyPublishers.noBody())
                    .header("X-Internal-Token", internalToken)
                    .timeout(java.time.Duration.ofSeconds(10))
                    .build();
            
            java.net.http.HttpResponse<Void> response = client.send(
                    request,
                    java.net.http.HttpResponse.BodyHandlers.discarding()
            );
            boolean accepted = response.statusCode() == 202;
            if (!accepted) {
                log.warn("Content synchronization trigger rejected with status {}", response.statusCode());
            }
            return new CrawlResult(accepted, 0, 0, 0, accepted ? 0 : 1);
        } catch (Exception e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.error("Failed to initialize content synchronization trigger", e);
            return new CrawlResult(false, 0, 0, 0, 1);
        }
    }

    public record ArticleStatusResponse(boolean exists, boolean needsRepair) {}

    public ArticleStatusResponse checkStatus(String url) {
        var existingOpt = articles.findBySourceUrl(url);
        if (existingOpt.isEmpty()) {
            return new ArticleStatusResponse(false, false);
        }
        return new ArticleStatusResponse(true, needsRepair(existingOpt.get()));
    }

    public boolean needsRepair(NewsArticle article) {
        String content = article.getContent();
        if (content == null || content.isBlank()) {
            return true;
        }
        String plainText = Jsoup.parse(content).text().trim();
        if (plainText.length() < 300) {
            return true;
        }
        String lower = plainText.toLowerCase();
        return lower.contains("access denied")
                || lower.contains("javascript is disabled")
                || lower.contains("verify that you're not a robot");
    }

    @Transactional
    public com.footballverse.news.dto.ArticleImportResponse importArticle(com.footballverse.news.dto.InternalArticleImportRequest request) {
        NewsSource source = sources.findById(request.sourceId())
                .orElseThrow(() -> new IllegalArgumentException("Source not found"));
        
        var existingOpt = articles.findBySourceUrl(request.sourceUrl());
        if (existingOpt.isPresent()) {
            NewsArticle article = existingOpt.get();
            if (needsRepair(article)) {
                String plainIncoming = Jsoup.parse(request.content()).text().trim();
                String lowerIncoming = plainIncoming.toLowerCase();
                boolean incomingIsBlocked = plainIncoming.length() < 300
                        || lowerIncoming.contains("access denied")
                        || lowerIncoming.contains("javascript is disabled")
                        || lowerIncoming.contains("verify that you're not a robot");
                
                if (!incomingIsBlocked) {
                    String rawContent = request.content();
                    if (request.imageUrl() != null && !request.imageUrl().isBlank()) {
                        rawContent = "<img src=\"" + request.imageUrl().trim() + "\" alt=\"" + request.title() + "\" />" + rawContent;
                    }
                    article.setContent(sanitizer.sanitize(rawContent));
                    articles.save(article);
                    log.info("Successfully repaired article: {}", request.title());
                    return new com.footballverse.news.dto.ArticleImportResponse("ACCEPTED", "Successfully repaired article");
                }
            }
            log.debug("Article already exists with URL: {}", request.sourceUrl());
            return new com.footballverse.news.dto.ArticleImportResponse("EXISTS", "Article already exists with URL");
        }

        String plainDesc = plainText(request.summary());
        if (!isFootballRelated(request.title(), plainDesc)) {
            log.debug("Skipping non-football article: {}", request.title());
            return new com.footballverse.news.dto.ArticleImportResponse("REJECTED", "Skipping non-football article");
        }

        String contentHash = hash(request.title(), plainDesc);
        if (articles.existsByContentHash(contentHash)) {
            log.debug("Article already exists with content hash for: {}", request.title());
            return new com.footballverse.news.dto.ArticleImportResponse("EXISTS", "Article already exists with content hash");
        }

        String rawContent = request.content();
        if (request.imageUrl() != null && !request.imageUrl().isBlank()) {
            rawContent = "<img src=\"" + request.imageUrl().trim() + "\" alt=\"" + request.title() + "\" />" + rawContent;
        }

        NewsArticle article = new NewsArticle();
        article.setTitle(request.title());
        article.setSlug(SlugUtil.uniqueSlug(request.title()));
        article.setSummary(summary(plainDesc));
        article.setContent(sanitizer.sanitize(rawContent));
        article.setSource(source);
        article.setSourceUrl(request.sourceUrl());
        article.setContentHash(contentHash);
        article.setStatus(ArticleStatus.PUBLISHED);
        article.setPublishedAt(request.publishedAt() != null ? request.publishedAt() : Instant.now());
        article.setCategory(matchCategory(List.of(), request.title(), plainDesc));

        articles.save(article);
        log.info("Successfully imported article: {}", request.title());
        return new com.footballverse.news.dto.ArticleImportResponse("ACCEPTED", "Import successful");
    }

    private NewsCategory matchCategory(List<String> categories, String title, String description) {
        if (categories != null) {
            for (String cat : categories) {
                if (cat == null || cat.isBlank()) continue;
                var match = categoryRepository.findBySlug(SlugUtil.slug(cat.trim()));
                if (match.isPresent()) return match.get();
            }
        }
        return categoryRepository.findBySlug(categorySlug(title, description, categories)).orElse(null);
    }

    private String categorySlug(String title, String description, List<String> categories) {
        String text = ((title == null ? "" : title) + " "
                + (description == null ? "" : description) + " "
                + (categories == null ? "" : String.join(" ", categories))).toLowerCase();
        if (containsAny(text, "transfer", "rumour", "rumor", "contract", "signing", "bid", "loan", "release clause")) {
            return "transfer-news";
        }
        if (containsAny(text, "preview", "prediction", "predicted", "line-up", "lineup", "odds", "team news", "before")) {
            return "match-preview-analysis";
        }
        if (containsAny(text, "wife", "girlfriend", "fashion", "car", "lifestyle", "instagram", "training ground", "behind the scenes")) {
            return "off-the-pitch";
        }
        if (containsAny(text, "opinion", "interview", "debate", "controversy", "referee", "var", "fans", "pundit")) {
            return "expert-fan-opinions";
        }
        if (containsAny(text, "tactic", "formation", "analysis", "stats", "xg", "pressing", "heatmap", "football facts")) {
            return "football-facts-tactical-insights";
        }
        return "others";
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) return true;
        }
        return false;
    }

    private String plainText(String html) {
        return html == null ? "" : Jsoup.parse(html).text().trim();
    }

    private String summary(String description) {
        if (description == null || description.isEmpty()) return "";
        return description.length() > 500 ? description.substring(0, 497) + "..." : description;
    }

    private String hash(String title, String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = title + "||" + (content != null ? content : "");
            byte[] encoded = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encoded);
        } catch (Exception e) {
            throw new RuntimeException("Failed to compute SHA-256 hash", e);
        }
    }

    private boolean isFootballRelated(String title, String description) {
        if (title == null) return false;
        String text = (title + " " + (description != null ? description : "")).toLowerCase();

        String[] excludeKeywords = {
            "nba", "wnba", "mlb", "nhl", "nfl", "baseball", "basketball", "hockey",
            "boxing", "ufc", "mma", "badminton", "cricket", "f1", "formula 1", "golf",
            "tennis", "wimbledon", "rugby", "cycling", "nascar", "wwe", "athletics",
            "esports", "e-sports", "valorant", "league of legends", "counter-strike"
        };
        for (String kw : excludeKeywords) {
            if (text.contains(" " + kw + " ") || text.startsWith(kw + " ") || text.endsWith(" " + kw) || text.equals(kw)) {
                return false;
            }
        }
        return true;
    }
}
