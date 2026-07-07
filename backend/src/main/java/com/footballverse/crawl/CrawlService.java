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
import com.footballverse.news.NewsSourceType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CrawlService {

    private static final long CRAWL_COOLDOWN_SECONDS = 3600;
    private static final int ENCODED_CONTENT_MIN_LEN = 300;
    private static final int REPAIR_MIN_TEXT_LEN = 600; // ponytail: under this → re-scrape likely stale summary
    // ponytail: recovery anchor — global per-invocation limit, prevents runaway from 30-links × scrape per link
    // equals 2× maxLinks default; bump default + this ceiling together when raising maxLinks.
    private static final int LINKS_MAX_SAVE = 60;

    public record CrawlResult(int saved, int repaired, int skipped, int failed) {}

    private final NewsArticleRepository articles;
    private final NewsSourceRepository sources;
    private final NewsCategoryRepository categoryRepository;
    private final RichTextSanitizer sanitizer;
    private final HtmlContentScraper htmlScraper;
    private final CrawlHttpClient http;
    private final ArticleLinkExtractor linkExtractor;

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
            if (!force) {
                int locked = sources.acquireCrawlLock(source.getId(), now, cutoff);
                if (locked == 0) {
                    log.debug("Skip source {} - recently crawled", source.getName());
                    skippedCount++;
                    continue;
                }
            }

            log.info("Starting crawl for source [type={}]: {}", source.getSourceType(), source.getName());
            try {
                List<RssParser.CrawledItem> items;
                if (source.getSourceType() == NewsSourceType.RSS) {
                    items = crawlRss(source);
                } else {
                    items = crawlScrape(source, savedCount + repairedCount + skippedCount);
                }

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

    private List<RssParser.CrawledItem> crawlRss(NewsSource source) {
        byte[] data = http.fetchBytes(source.getFeedUrl(), true);
        if (data == null) return List.of();
        try {
            return RssParser.parse(new ByteArrayInputStream(data));
        } catch (Exception e) {
            log.error("Failed to parse RSS feed for {}", source.getName(), e);
            return List.of();
        }
    }

    private List<RssParser.CrawledItem> crawlScrape(NewsSource source, int alreadySaved) {
        List<String> links = linkExtractor.extractLinks(source, http);
        if (links.isEmpty()) {
            log.warn("No article links extracted for source {}", source.getName());
            return List.of();
        }
        List<RssParser.CrawledItem> items = new ArrayList<>();
        for (String link : links) {
            // ponytail: LINKS_MAX_SAVE — global anchor so crawl never overshoots user's maxLinks × 2
            if (alreadySaved + items.size() >= LINKS_MAX_SAVE) {
                log.debug("Hit global save cap ({}) — stopping link extraction early for source {}",
                        LINKS_MAX_SAVE, source.getName());
                break;
            }
            // dedup by sourceUrl BEFORE scraping — skip existing without fetching article page
            if (articles.findBySourceUrl(link).isPresent()) continue;
            try {
                byte[] rawHtml = http.fetchBytes(link, false);
                if (rawHtml == null) continue;
                Document doc = Jsoup.parse(new String(rawHtml, StandardCharsets.UTF_8), link);

                String title = doc.title();
                if (title == null || title.isBlank()) {
                    Element ogTitle = doc.selectFirst("meta[property=og:title]");
                    title = ogTitle != null ? ogTitle.attr("content").trim() : "Untitled";
                }

                Element descEl = doc.selectFirst("meta[name=description], meta[property=og:description]");
                String metaDesc = descEl != null ? descEl.attr("content").trim() : "";

                Instant pubDate = extractFromMeta(doc);

                Element authorMeta = doc.selectFirst("meta[name=article:author],meta[name=author]");
                String author = authorMeta != null ? authorMeta.attr("content").trim() : "";

                // ponytail: scrape-only items give thumbnail=og:image so prependFeedMedia still works before scrape fallback
                Element ogImg = doc.selectFirst("meta[property=og:image]");
                String thumb = ogImg != null ? ogImg.attr("content").trim() : null;
                Element ogVid = doc.selectFirst("meta[property=og:video]");
                String videoUrl = ogVid != null ? ogVid.attr("content").trim() : null;

                items.add(new RssParser.CrawledItem(title, link, metaDesc, pubDate,
                        null, thumb, author, videoUrl, List.of()));
            } catch (Exception e) {
                log.warn("Failed to scrape headline for {}: {}", link, e.getMessage());
            }
        }
        return items;
    }

    private Instant extractFromMeta(Document doc) {
        Element pubMeta = doc.selectFirst(
                "meta[name=article:published_time], meta[property=article:published_time], meta[name=date]");
        if (pubMeta != null) {
            String val = pubMeta.attr("content");
            if (val != null && !val.isBlank()) {
                try { return Instant.parse(val.trim()); } catch (Exception ignored) {}
                try { return java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME.parse(val.trim(), Instant::from); } catch (Exception ignored) {}
            }
        }
        return Instant.now();
    }

    private String resolveFullContent(RssParser.CrawledItem item, String description) {
        String encoded = item.encodedContent();
        if (encoded != null && !encoded.isBlank() && Jsoup.parse(encoded).text().length() >= ENCODED_CONTENT_MIN_LEN) {
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

    private boolean repairArticle(NewsArticle article, RssParser.CrawledItem item, String description) {
        boolean changed = false;
        if (hasHtml(article.getSummary())) {
            article.setSummary(summary(plainText(description)));
            changed = true;
        }
        if (needsFullContent(article, description)) {
            // ponytail: re-scrape article URL to get updated/longer content
            String scraped = resolveFullContent(item, description);
            if (plainText(scraped).equals(plainText(article.getContent()))) return changed; // no material change
            String fullContent = sanitizer.sanitize(scraped);
            int currentLen = article.getContent() == null ? 0 : Jsoup.parse(article.getContent()).text().length();
            int candidateLen = Jsoup.parse(fullContent).text().length();
            if (addsMedia(article.getContent(), fullContent)
                    || candidateLen > currentLen + (currentLen / 5) // ≥ 20% longer text
                    || candidateLen > currentLen && currentLen < REPAIR_MIN_TEXT_LEN) {
                article.setContent(fullContent);
                article.setContentHash(hash(article.getTitle(), description));
                changed = true;
            }
        }
        if (changed) articles.save(article);
        return changed;
    }

    // ponytail: repair when content looks thin or suspicious — broader than before (dropped exact-equals)
    private boolean needsFullContent(NewsArticle article, String description) {
        String content = article.getContent();
        return content == null
                || content.isBlank()
                || hasHtml(article.getSummary())
                || Jsoup.parse(content).text().length() < REPAIR_MIN_TEXT_LEN;
    }

    private String plainText(String html) {
        return html == null ? "" : Jsoup.parse(html).text().trim();
    }

    private String summary(String description) {
        if (description == null || description.isEmpty()) return "";
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
            String url = videoUrl.trim();
            if (HtmlContentScraper.isEmbeddable(url) || !HtmlContentScraper.isDirectVideoUrl(url)) {
                return "<iframe src=\"" + HtmlContentScraper.escapeAttr(url) + "\" width=\"100%\" height=\"400\" allowfullscreen></iframe>" + body;
            } else {
                String poster = item.thumbnailUrl() == null || item.thumbnailUrl().isBlank()
                        ? ""
                        : " poster=\"" + HtmlContentScraper.escapeAttr(item.thumbnailUrl().trim()) + "\"";
                return "<video src=\"" + HtmlContentScraper.escapeAttr(url) + "\" controls" + poster + "></video>" + body;
            }
        }

        String thumbnailUrl = item.thumbnailUrl();
        if (thumbnailUrl != null && !thumbnailUrl.isBlank()) {
            return "<img src=\"" + HtmlContentScraper.escapeAttr(thumbnailUrl.trim()) + "\" alt=\"" + HtmlContentScraper.escapeAttr(item.title()) + "\" />" + body;
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
