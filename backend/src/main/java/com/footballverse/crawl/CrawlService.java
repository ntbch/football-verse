package com.footballverse.crawl;

import com.footballverse.common.text.RichTextSanitizer;
import com.footballverse.common.text.SlugUtil;
import com.footballverse.news.ArticleStatus;
import com.footballverse.news.NewsArticle;
import com.footballverse.news.NewsArticleRepository;
import com.footballverse.news.NewsCategory;
import com.footballverse.news.NewsCategoryRepository;
import com.footballverse.news.NewsSource;
import com.footballverse.news.NewsSourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CrawlService {

    private static final long CRAWL_COOLDOWN_SECONDS = 3600;
    private static final int ENCODED_CONTENT_MIN_LEN = 300;

    public record CrawlResult(int saved, int repaired, int skipped, int failed) {}

    private final NewsArticleRepository articles;
    private final NewsSourceRepository sources;
    private final NewsCategoryRepository categoryRepository;
    private final RichTextSanitizer sanitizer;
    private final HtmlContentScraper htmlScraper;
    private final FeedFetcher feedFetcher;

    @Transactional
    public CrawlResult crawl() {
        return crawl(false);
    }

    @Transactional
    public CrawlResult crawl(boolean force) {
        List<NewsSource> activeSources = sources.findByActiveTrue();
        int savedCount = 0;
        int repairedCount = 0;
        int skippedCount = 0;
        int failedCount = 0;
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(CRAWL_COOLDOWN_SECONDS);

        for (NewsSource source : activeSources) {
            if (force) {
                source.setLastCrawledAt(now);
            } else {
                // ponytail: UPDATE...WHERE lastCrawledAt<cutoff atomic ở row-level; 2 run concurrent
                // đều gọi nhưng chỉ 1 trả 1, kia trả 0 và skip — không cần lock table riêng.
                int locked = sources.acquireCrawlLock(source.getId(), now, cutoff);
                if (locked == 0) {
                    log.debug("Skip source {} - recently crawled or inactive", source.getName());
                    skippedCount++;
                    continue;
                }
            }

            log.info("Starting crawl for source: {}", source.getName());
            try {
                byte[] data = fetchFeed(source.getFeedUrl());
                if (data == null) {
                    failedCount++;
                    continue;
                }

                List<RssParser.CrawledItem> items = RssParser.parse(new ByteArrayInputStream(data));
                for (RssParser.CrawledItem item : items) {
                    String description = plainText(item.description());
                    var existing = articles.findBySourceUrl(item.link());
                    if (existing.isPresent()) {
                        if (repairArticle(existing.get(), item, description)) repairedCount++;
                        else skippedCount++;
                        continue;
                    }

                    if (!isFootballRelated(item.title(), description)) {
                        log.debug("Skipping non-football article: {}", item.title());
                        skippedCount++;
                        continue;
                    }

                    String contentHash = hash(item.title(), description);
                    if (articles.existsByContentHash(contentHash)) {
                        skippedCount++;
                        continue;
                    }

                    NewsArticle article = new NewsArticle();
                    article.setTitle(item.title());
                    article.setSlug(SlugUtil.uniqueSlug(item.title()));
                    article.setSummary(summary(description));
                    String fullContent = resolveFullContent(item, description);
                    article.setContent(sanitizer.sanitize(fullContent));
                    article.setSource(source);
                    article.setSourceUrl(item.link());
                    article.setContentHash(contentHash);
                    article.setStatus(ArticleStatus.PUBLISHED);
                    article.setPublishedAt(item.pubDate());
                    article.setCategory(matchCategory(item.categories(), item.title(), description));

                    articles.save(article);
                    savedCount++;
                }
            } catch (Exception e) {
                failedCount++;
                log.error("Failed to crawl source {}", source.getName(), e);
            }
        }
        return new CrawlResult(savedCount, repairedCount, skippedCount, failedCount);
    }

    /**
     * Prefer full HTML from <content:encoded> when substantial — skips the scrape HTTP round-trip.
     * Falls back to scraping the article page.
     */
    private String resolveFullContent(RssParser.CrawledItem item, String description) {
        String encoded = item.encodedContent();
        if (encoded != null && !encoded.isBlank() && Jsoup.parse(encoded).text().length() >= ENCODED_CONTENT_MIN_LEN) {
            // ponytail: author byline prepended only on the encoded-content path; sanitizer cleans it.
            String author = item.author() == null ? "" : Jsoup.parse(item.author()).text().trim();
            String byline = author.isBlank() ? "" : "<p class=\"byline\">By " + author + "</p>";
            return prependFeedMedia(item, byline + encoded);
        }
        return prependFeedMedia(item, htmlScraper.scrape(item.link(), description));
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

    public byte[] fetchFeed(String url) {
        FeedFetcher.FetchResult result = feedFetcher.fetch(url);
        if (result.notModified()) {
            log.info("Source unchanged (304): {}", url);
            return null;
        }
        return result.body();
    }

    private boolean repairArticle(NewsArticle article, RssParser.CrawledItem item, String description) {
        boolean changed = false;
        if (hasHtml(article.getSummary())) {
            article.setSummary(summary(description));
            changed = true;
        }
        if (needsFullContent(article, description)) {
            String fullContent = sanitizer.sanitize(resolveFullContent(item, description));
            int currentLength = article.getContent() == null ? 0 : article.getContent().length();
            if (addsMedia(article.getContent(), fullContent) || fullContent.length() > currentLength) {
                article.setContent(fullContent);
                article.setContentHash(hash(item.title(), description));
                changed = true;
            }
        }
        if (changed) {
            articles.save(article);
        }
        return changed;
    }

    private boolean needsFullContent(NewsArticle article, String description) {
        String content = article.getContent();
        return content == null
                || content.isBlank()
                || content.length() < 300
                || plainText(content).equals(description)
                || hasHtml(article.getSummary());
    }

    private String plainText(String html) {
        return html == null ? "" : Jsoup.parse(html).text().trim();
    }

    private String summary(String description) {
        return description.length() > 500 ? description.substring(0, 497) + "..." : description;
    }

    private boolean hasHtml(String value) {
        return value != null && value.matches("(?s).*<[^>]+>.*");
    }

    private String prependFeedMedia(RssParser.CrawledItem item, String content) {
        String body = content == null ? "" : content;
        if (hasMedia(body)) return body;

        String videoUrl = item.videoUrl();
        if (videoUrl != null && !videoUrl.isBlank()) {
            String poster = item.thumbnailUrl() == null || item.thumbnailUrl().isBlank()
                    ? ""
                    : " poster=\"" + escapeAttr(item.thumbnailUrl().trim()) + "\"";
            return "<video src=\"" + escapeAttr(videoUrl.trim()) + "\" controls" + poster + "></video>" + body;
        }

        String thumbnailUrl = item.thumbnailUrl();
        if (thumbnailUrl != null && !thumbnailUrl.isBlank()) {
            return "<img src=\"" + escapeAttr(thumbnailUrl.trim()) + "\" alt=\"" + escapeAttr(item.title()) + "\" />" + body;
        }
        return body;
    }

    private boolean addsMedia(String current, String candidate) {
        return !hasMedia(current) && hasMedia(candidate);
    }

    private boolean hasMedia(String html) {
        if (html == null || html.isBlank()) return false;
        return Jsoup.parse(html).selectFirst("img[src], video[src], video source[src], iframe[src]") != null;
    }

    private String escapeAttr(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("\"", "&quot;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
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
            byte[] encoded = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encoded);
        } catch (Exception e) {
            throw new RuntimeException("Failed to compute SHA-256 hash", e);
        }
    }
}
