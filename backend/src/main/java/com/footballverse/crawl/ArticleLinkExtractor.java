package com.footballverse.crawl;

import com.footballverse.news.NewsSource;
import com.footballverse.news.NewsSourceType;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
@Slf4j
public class ArticleLinkExtractor {

    private final int maxLinks;

    public ArticleLinkExtractor(
            @Value("${app.crawl.scrape.max-links:30}") int maxLinks) {
        this.maxLinks = maxLinks;
    }

    public List<String> extractLinks(NewsSource source, CrawlHttpClient http) {
        if (source.getSourceType() == NewsSourceType.SITEMAP) {
            return extractFromSitemap(source.getFeedUrl(), http);
        }
        if (source.getSourceType() == NewsSourceType.HOMEPAGE) {
            return extractFromHomepage(source, http);
        }
        return List.of();
    }

    private List<String> extractFromSitemap(String sitemapUrl, CrawlHttpClient http) {
        byte[] data = http.fetchBytes(sitemapUrl, false);
        if (data == null) return List.of();
        try {
            Set<String> urls = new LinkedHashSet<>();
            Document sitemapDoc = Jsoup.parse(new String(data, StandardCharsets.UTF_8), "", Parser.xmlParser());

            // sitemapindex → parse nested sitemaps (1 level deep)
            for (Element sitemap : sitemapDoc.select("sitemapindex > sitemap > loc, sitemap > loc")) {
                String subUrl = sitemap.text().trim();
                if (subUrl.isBlank()) continue;
                byte[] subData = http.fetchBytes(subUrl, false);
                if (subData == null) continue;
                Document subDoc = Jsoup.parse(new String(subData, StandardCharsets.UTF_8), "", Parser.xmlParser());
                urls.addAll(extractLocElements(subDoc));
                if (urls.size() >= maxLinks) break;
            }
            if (urls.size() < maxLinks) {
                urls.addAll(extractLocElements(sitemapDoc));
            }
            return urls.stream().limit(maxLinks).toList();
        } catch (Exception e) {
            log.error("Failed to parse sitemap {}", sitemapUrl, e);
            return List.of();
        }
    }

    private List<String> extractLocElements(Document doc) {
        List<String> urls = new ArrayList<>();
        for (Element loc : doc.select("urlset > url > loc, url > loc")) {
            String url = loc.text().trim();
            if (!url.isBlank()) urls.add(url);
        }
        return urls;
    }

    private List<String> extractFromHomepage(NewsSource source, CrawlHttpClient http) {
        byte[] rawHtml = http.fetchBytes(source.getFeedUrl(), false);
        if (rawHtml == null) return List.of();
        Document doc = Jsoup.parse(new String(rawHtml, StandardCharsets.UTF_8), source.getFeedUrl());
        String host = URI.create(source.getFeedUrl()).getHost();

        Set<String> urls = new LinkedHashSet<>();
        // ponytail: N² set, ~100 links — linear scan is fine until N > 5000
        String selector = source.getCssSelector() != null && !source.getCssSelector().isBlank()
                ? source.getCssSelector() : "a[href]";

        for (org.jsoup.nodes.Element link : doc.select(selector)) {
            if (!"a".equals(link.tagName())) {
                // selector could match non-anchor containers → search within
                for (org.jsoup.nodes.Element a : link.select("a[href]")) {
                    String articleUrl = articleUrl(a, host);
                    if (articleUrl != null) {
                        urls.add(articleUrl);
                        if (urls.size() >= maxLinks) return new ArrayList<>(urls);
                    }
                }
                continue;
            }
            String articleUrl = articleUrl(link, host);
            if (articleUrl != null) {
                urls.add(articleUrl);
                if (urls.size() >= maxLinks) return new ArrayList<>(urls);
            }
        }
        return urls.stream().limit(maxLinks).toList();
    }

    private String articleUrl(org.jsoup.nodes.Element a, String host) {
        String href = a.absUrl("href");
        if (href.isBlank()) return null;
        try {
            URI uri = URI.create(href);
            if (uri.getScheme() == null || !"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) return null;
            if (uri.getHost() == null) return null;
            if (!uri.getHost().equals(host)) return null; // stay within same domain
            String path = uri.getPath();
            if (path == null || path.equals("/") || path.isBlank()) return null;
            // ponytail: heuristic — article path has ≥2 segments, skip known non-article paths
            String[] segments = path.split("/");
            if (segments.length < 2) return null;
            String first = segments[1].toLowerCase();
            if (isNavPath(first)) return null;
            return href;
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isNavPath(String segment) {
        // ponytail: common non-article path prefixes; expand when a source gets noisy
        return segment.equals("about") || segment.equals("contact") ||
               segment.equals("tag") || segment.equals("tags") ||
               segment.equals("category") || segment.equals("categories") ||
               segment.equals("author") || segment.equals("authors") ||
               segment.equals("search") || segment.equals("privacy") ||
               segment.equals("terms") || segment.equals("help") ||
               segment.equals("advertise") || segment.equals("jobs") ||
               segment.equals("newsletter") || segment.equals("archive") ||
               segment.equals("videos") || segment.equals("photos") ||
               segment.equals("live") || segment.equals("watch") ||
               segment.equals("podcasts") || segment.equals("fixtures-results");
    }

}