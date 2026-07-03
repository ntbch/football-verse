package com.footballverse.news;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.net.URI;

@Component
@Slf4j
public class HtmlContentScraper {

    private static final String SCRAPER_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final int SCRAPER_TIMEOUT_MS = 10_000;

    public String scrape(String url, String fallbackDescription) {
        if (url == null || url.isBlank()) {
            return fallbackDescription;
        }
        try {
            // Fetch HTML using Jsoup with User-Agent to prevent getting blocked
            Document doc = Jsoup.connect(url)
                    .userAgent(SCRAPER_USER_AGENT)
                    .timeout(SCRAPER_TIMEOUT_MS)
                    .followRedirects(true)
                    .get();

            String host = URI.create(url).getHost();
            if (host == null) {
                return extractFallback(doc, fallbackDescription);
            }

            // Site-specific selectors
            if (host.contains("bongda24h.vn")) {
                Element detail = doc.selectFirst("#content-detail, .the-article-body, .content_detail, .the-content-detail");
                if (detail != null) {
                    return cleanAndFormatHtml(detail);
                }
            } else if (host.contains("thethao247.vn")) {
                Element detail = doc.selectFirst(".content-detail, .detail-content, .content-news, article");
                if (detail != null) {
                    return cleanAndFormatHtml(detail);
                }
            } else if (host.contains("goal.com")) {
                Element detail = doc.selectFirst(".article-body, [class*=\"article-body\"], article");
                if (detail != null) {
                    return cleanAndFormatHtml(detail);
                }
            } else if (host.contains("transfermarkt")) {
                Element detail = doc.selectFirst(".news-text, .news_text, article");
                if (detail != null) {
                    return cleanAndFormatHtml(detail);
                }
            } else if (host.contains("tribuna.com")) {
                Element detail = doc.selectFirst("article, [data-testid=\"article-content\"], .post-body");
                if (detail != null) {
                    return cleanAndFormatHtml(detail);
                }
            } else if (host.contains("espn.com")) {
                Element detail = doc.selectFirst(".article-body, article");
                if (detail != null) {
                    return cleanAndFormatHtml(detail);
                }
            } else if (host.contains("bbci.co.uk") || host.contains("bbc.com")) {
                Element detail = doc.selectFirst("article, .story-body__inner");
                if (detail != null) {
                    return cleanAndFormatHtml(detail);
                }
            }

            return extractFallback(doc, fallbackDescription);
        } catch (Exception e) {
            log.warn("Failed to scrape full article from url: {}. Error: {}", url, e.getMessage());
            return fallbackDescription;
        }
    }

    private String extractFallback(Document doc, String fallbackDescription) {
        Element article = doc.selectFirst("article");
        if (article != null) {
            return cleanAndFormatHtml(article);
        }

        Element bestContainer = null;
        int maxParagraphs = 0;
        for (Element element : doc.select("div, section")) {
            int pCount = element.select("p").size();
            if (pCount > maxParagraphs) {
                maxParagraphs = pCount;
                bestContainer = element;
            }
        }
        if (bestContainer != null && maxParagraphs > 2) {
            return cleanAndFormatHtml(bestContainer);
        }

        return fallbackDescription;
    }

    private String cleanAndFormatHtml(Element container) {
        Elements paragraphs = container.select("p, h2, h3, h4");
        StringBuilder sb = new StringBuilder();
        for (Element p : paragraphs) {
            String text = p.text().trim();
            if (text.isEmpty() || text.length() < 10) {
                continue;
            }
            if (text.toLowerCase().contains("xem thêm") || text.toLowerCase().contains("related posts") || text.toLowerCase().contains("chia sẻ")) {
                continue;
            }
            if (p.tagName().startsWith("h")) {
                sb.append("<h3>").append(text).append("</h3>");
            } else {
                sb.append("<p>").append(text).append("</p>");
            }
        }
        String content = sb.toString().trim();
        return content.isEmpty() ? container.html() : content;
    }
}
