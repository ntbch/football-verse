package com.footballverse.news;

import com.footballverse.common.text.RichTextSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayInputStream;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class CrawlService {

    private static final long CRAWL_COOLDOWN_SECONDS = 3600;

    private final NewsArticleRepository articles;
    private final NewsSourceRepository sources;
    private final RichTextSanitizer sanitizer;
    private final HtmlContentScraper htmlScraper;

    private RestTemplate restTemplate = new RestTemplate();

    /** Setter for test injection of a mock RestTemplate. */
    public void setRestTemplate(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Transactional
    public int crawl() {
        List<NewsSource> activeSources = sources.findByActiveTrue();
        int savedCount = 0;
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(CRAWL_COOLDOWN_SECONDS);

        for (NewsSource source : activeSources) {
            int locked = sources.acquireCrawlLock(source.getId(), now, cutoff);
            if (locked == 0) {
                log.debug("Skip source {} - recently crawled or inactive", source.getName());
                continue;
            }

            log.info("Starting crawl for source: {}", source.getName());
            try {
                byte[] data = fetchFeed(source.getFeedUrl());
                if (data == null) {
                    log.warn("Empty response from source: {}", source.getName());
                    continue;
                }

                List<RssParser.CrawledItem> items = RssParser.parse(new ByteArrayInputStream(data));
                for (RssParser.CrawledItem item : items) {
                    if (articles.existsBySourceUrl(item.link())) {
                        continue;
                    }

                    if (!isFootballRelated(item.title(), item.description())) {
                        log.debug("Skipping non-football article: {}", item.title());
                        continue;
                    }

                    String contentHash = hash(item.title(), item.description());
                    if (articles.existsByContentHash(contentHash)) {
                        continue;
                    }

                    NewsArticle article = new NewsArticle();
                    article.setTitle(item.title());
                    article.setSlug(uniqueSlug(item.title()));
                    article.setSummary(item.description().length() > 500
                            ? item.description().substring(0, 497) + "..."
                            : item.description());
                    String fullContent = htmlScraper.scrape(item.link(), item.description());
                    article.setContent(sanitizer.sanitize(fullContent));
                    article.setSource(source);
                    article.setSourceUrl(item.link());
                    article.setContentHash(contentHash);
                    article.setStatus(ArticleStatus.PUBLISHED);
                    article.setPublishedAt(item.pubDate());

                    articles.save(article);
                    savedCount++;
                }
            } catch (Exception e) {
                log.error("Failed to crawl source {}", source.getName(), e);
            }
        }
        return savedCount;
    }

    public byte[] fetchFeed(String url) {
        try {
            return restTemplate.getForObject(url, byte[].class);
        } catch (Exception e) {
            log.error("Failed to fetch RSS feed from URL: {}", url, e);
            return null;
        }
    }

    private boolean isFootballRelated(String title, String description) {
        if (title == null) return false;
        String text = (title + " " + (description != null ? description : "")).toLowerCase();

        String[] excludeKeywords = {
            "nba", "wnba", "mlb", "nhl", "nfl", "baseball", "basketball", "hockey",
            "boxing", "ufc", "mma", "badminton", "cricket", "f1", "formula 1", "golf",
            "tennis", "wimbledon", "rugby", "cycling", "nascar", "wwe", "athletics",
            "bóng rổ", "bóng chuyền", "cầu lông", "đua xe", "võ thuật", "quần vợt", "bơi lội"
        };
        for (String kw : excludeKeywords) {
            if (text.contains(" " + kw + " ") || text.startsWith(kw + " ") || text.endsWith(" " + kw) || text.equals(kw)) {
                return false;
            }
        }
        return true;
    }

    private String hash(String title, String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = title + "||" + (content != null ? content : "");
            byte[] encoded = digest.digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : encoded) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to compute SHA-256 hash", e);
        }
    }

    private String uniqueSlug(String value) {
        return slug(value) + "-" + System.currentTimeMillis();
    }

    private String slug(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}
