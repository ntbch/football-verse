package com.footballverse.crawl;

import com.footballverse.news.NewsSource;
import com.footballverse.news.NewsSourceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleLinkExtractorTest {

    private ArticleLinkExtractor extractor;

    @Mock
    private CrawlHttpClient httpClient;

    @BeforeEach
    void setUp() {
        extractor = new ArticleLinkExtractor(10);
    }

    @Test
    void extractFromSitemap() {
        String xml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                    <url><loc>https://example.com/news/haaland-hat-trick</loc></url>
                    <url><loc>https://example.com/news/arsenal-sign-midfielder</loc></url>
                    <url><loc>https://example.com/about</loc></url>
                </urlset>
                """;
        when(httpClient.fetchBytes(any(), anyBoolean()))
                .thenReturn(xml.getBytes(StandardCharsets.UTF_8));

        NewsSource source = new NewsSource("Test", "https://example.com/sitemap.xml");
        source.setSourceType(NewsSourceType.SITEMAP);

        List<String> links = extractor.extractLinks(source, httpClient);
        assertThat(links).containsExactlyInAnyOrder(
                "https://example.com/news/haaland-hat-trick",
                "https://example.com/news/arsenal-sign-midfielder",
                "https://example.com/about");
    }

    @Test
    void extractFromSitemapIndex() {
        String indexXml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                    <sitemap><loc>https://example.com/sitemap-news.xml</loc></sitemap>
                </sitemapindex>
                """;
        String newsXml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                    <url><loc>https://example.com/news/transfer-news</loc></url>
                </urlset>
                """;
        when(httpClient.fetchBytes(any(), anyBoolean()))
                .thenReturn(indexXml.getBytes(StandardCharsets.UTF_8))
                .thenReturn(newsXml.getBytes(StandardCharsets.UTF_8));

        NewsSource source = new NewsSource("Test", "https://example.com/sitemap-index.xml");
        source.setSourceType(NewsSourceType.SITEMAP);

        List<String> links = extractor.extractLinks(source, httpClient);
        assertThat(links).containsExactly("https://example.com/news/transfer-news");
    }

    @Test
    void extractFromHomepageHeuristic() {
        String html = """
                <html><body>
                    <a href="https://example.com/news/haaland-hat-trick">Haaland hat-trick</a>
                    <a href="https://example.com/2026/07/04/arsenal-signing">Arsenal deal</a>
                    <a href="https://example.com/about">About</a>
                    <a href="https://example.com/category/transfers">Transfers</a>
                    <a href="https://example.com/videos/match">Match video</a>
                    <a href="https://example.com/">Home</a>
                    <a href="https://other.com/news">External</a>
                </body></html>
                """;
        when(httpClient.fetchBytes(eq("https://example.com"), anyBoolean())).thenReturn(html.getBytes(StandardCharsets.UTF_8));

        NewsSource source = new NewsSource("Test", "https://example.com");
        source.setSourceType(NewsSourceType.HOMEPAGE);

        List<String> links = extractor.extractLinks(source, httpClient);
        // must include article-like links, exclude nav/video/home/external
        assertThat(links).contains(
                "https://example.com/news/haaland-hat-trick",
                "https://example.com/2026/07/04/arsenal-signing");
        assertThat(links).doesNotContain(
                "https://example.com/about",
                "https://example.com/category/transfers",
                "https://example.com/videos/match",
                "https://example.com/",
                "https://other.com/news");
    }

    @Test
    void extractFromHomepageWithCssSelector() {
        String html = """
                <html><body>
                    <div class="headlines">
                        <a href="https://example.com/news/top-story">Top</a>
                    </div>
                    <div class="sidebar">
                        <a href="https://example.com/news/other">Other</a>
                    </div>
                </body></html>
                """;
        when(httpClient.fetchBytes(eq("https://example.com"), anyBoolean())).thenReturn(html.getBytes(StandardCharsets.UTF_8));

        NewsSource source = new NewsSource("Test", "https://example.com");
        source.setSourceType(NewsSourceType.HOMEPAGE);
        source.setCssSelector(".headlines a");

        List<String> links = extractor.extractLinks(source, httpClient);
        assertThat(links).containsExactly("https://example.com/news/top-story");
        assertThat(links).doesNotContain("https://example.com/news/other");
    }

    @Test
    void respectsMaxLinks() {
        extractor = new ArticleLinkExtractor(2);
        String xml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                    <url><loc>https://example.com/a</loc></url>
                    <url><loc>https://example.com/b</loc></url>
                    <url><loc>https://example.com/c</loc></url>
                </urlset>
                """;
        when(httpClient.fetchBytes(any(), anyBoolean()))
                .thenReturn(xml.getBytes(StandardCharsets.UTF_8));

        NewsSource source = new NewsSource("Test", "https://example.com/sitemap.xml");
        source.setSourceType(NewsSourceType.SITEMAP);

        List<String> links = extractor.extractLinks(source, httpClient);
        assertThat(links).hasSize(2);
    }
}