package com.footballverse;

import com.footballverse.crawl.CrawlService;
import com.footballverse.crawl.FeedFetcher;
import com.footballverse.crawl.HtmlContentScraper;
import com.footballverse.news.ArticleStatus;
import com.footballverse.news.NewsArticle;
import com.footballverse.news.NewsArticleRepository;
import com.footballverse.news.NewsSource;
import com.footballverse.news.NewsSourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.boot.test.mock.mockito.MockBean;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@SpringBootTest
@TestPropertySource(properties = "app.crawl.startup-enabled=false")
@Transactional
public class RssCrawlerTest {

    static {
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    private static final String FEED_URL = "http://localhost:8080/mock-rss";

    @Autowired
    private NewsSourceRepository sourceRepository;

    @Autowired
    private NewsArticleRepository articleRepository;

    @Autowired
    private CrawlService crawlService;

    @MockBean
    private FeedFetcher mockFeedFetcher;

    @MockBean
    private HtmlContentScraper mockHtmlScraper;

    private NewsSource activeSource;

    @BeforeEach
    public void setup() {
        // Mock html scraper to return the fallback description by default
        when(mockHtmlScraper.scrape(anyString(), anyString())).thenAnswer(invocation -> invocation.getArgument(1));

        // Retrieve or create the test source dynamically
        activeSource = sourceRepository.findByFeedUrl(FEED_URL)
                .orElseGet(() -> {
                    NewsSource src = new NewsSource("Test RSS Feed", FEED_URL);
                    src.setActive(true);
                    return sourceRepository.save(src);
                });
        activeSource.setActive(true);
        activeSource.setLastCrawledAt(null);
        activeSource = sourceRepository.saveAndFlush(activeSource);
    }

    private void stubFeed(String content) {
        when(mockFeedFetcher.fetch(FEED_URL))
                .thenReturn(new FeedFetcher.FetchResult(content.getBytes(StandardCharsets.UTF_8), false));
    }

    @Test
    public void testCrawlSuccessRss20() {
        String rssContent = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0">
                <channel>
                    <title>Mock Soccer News</title>
                    <link>http://localhost:8080</link>
                    <description>Football Verse Mock Feed</description>
                    <item>
                        <title>Erling Haaland scores hat-trick</title>
                        <link>http://localhost:8080/news/haaland-hat-trick</link>
                        <description>Haaland shines again in Manchester City win.</description>
                        <pubDate>Fri, 03 Jul 2026 12:00:00 GMT</pubDate>
                    </item>
                    <item>
                        <title>Arsenal sign new midfielder</title>
                        <link>http://localhost:8080/news/arsenal-midfielder</link>
                        <description>Arsenal secure deal for rising star.</description>
                        <pubDate>Fri, 03 Jul 2026 13:00:00 GMT</pubDate>
                    </item>
                </channel>
                </rss>
                """;
        stubFeed(rssContent);

        CrawlService.CrawlResult result = crawlService.crawl();
        assertThat(result.saved()).isEqualTo(2);

        List<NewsArticle> savedArticles = articleRepository.findAll().stream()
                .filter(a -> a.getSourceUrl() != null && a.getSourceUrl().startsWith("http://localhost:8080"))
                .toList();
        assertThat(savedArticles).hasSize(2);
        assertThat(savedArticles).extracting(NewsArticle::getTitle)
                .containsExactlyInAnyOrder("Erling Haaland scores hat-trick", "Arsenal sign new midfielder");

        NewsArticle haaland = savedArticles.stream()
                .filter(a -> a.getTitle().equals("Erling Haaland scores hat-trick"))
                .findFirst().orElseThrow();
        assertThat(haaland.getStatus()).isEqualTo(ArticleStatus.PUBLISHED);
        assertThat(haaland.getSourceUrl()).isEqualTo("http://localhost:8080/news/haaland-hat-trick");
        assertThat(haaland.getCategory()).isNull();
        assertThat(haaland.getAuthor()).isNull();
        assertThat(haaland.getPublishedAt()).isNotNull();
    }

    @Test
    public void testCrawlSuccessAtom() {
        String atomContent = """
                <?xml version="1.0" encoding="utf-8"?>
                <feed xmlns="http://www.w3.org/2005/Atom">
                    <title>Mock Atom Feed</title>
                    <updated>2026-07-03T12:00:00Z</updated>
                    <entry>
                        <title>Chelsea appoint new manager</title>
                        <link href="http://localhost:8080/news/chelsea-manager"/>
                        <summary>Chelsea announce tactical overhaul.</summary>
                        <updated>2026-07-03T11:30:00Z</updated>
                    </entry>
                </feed>
                """;
        stubFeed(atomContent);

        CrawlService.CrawlResult result = crawlService.crawl();
        assertThat(result.saved()).isEqualTo(1);

        List<NewsArticle> savedArticles = articleRepository.findAll().stream()
                .filter(a -> a.getSourceUrl() != null && a.getSourceUrl().startsWith("http://localhost:8080"))
                .toList();
        assertThat(savedArticles).hasSize(1);
        assertThat(savedArticles.get(0).getTitle()).isEqualTo("Chelsea appoint new manager");
        assertThat(savedArticles.get(0).getSourceUrl()).isEqualTo("http://localhost:8080/news/chelsea-manager");
    }

    @Test
    public void testCrawlSuccessCustomDateFormat() {
        String rssContent = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0">
                <channel>
                    <item>
                        <title>Vietnamese Football News</title>
                        <link>http://localhost:8080/news/vietnamese-football</link>
                        <description>Custom formatted date parsing check.</description>
                        <pubDate>2026/07/03 19:58:38</pubDate>
                    </item>
                </channel>
                </rss>
                """;
        stubFeed(rssContent);

        CrawlService.CrawlResult result = crawlService.crawl();
        assertThat(result.saved()).isEqualTo(1);

        List<NewsArticle> savedArticles = articleRepository.findAll().stream()
                .filter(a -> a.getSourceUrl() != null && a.getSourceUrl().equals("http://localhost:8080/news/vietnamese-football"))
                .toList();
        assertThat(savedArticles).hasSize(1);
        assertThat(savedArticles.get(0).getPublishedAt()).isEqualTo(Instant.parse("2026-07-03T12:58:38Z"));
    }

    @Test
    public void testCrawlSkipsNonFootballSports() {
        String rssContent = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0">
                <channel>
                    <item>
                        <title>Lakers sign LeBron to extension in NBA</title>
                        <link>http://localhost:8080/news/nba-lebron</link>
                        <description>NBA free agency news.</description>
                    </item>
                    <item>
                        <title>Man City vs Real Madrid preview</title>
                        <link>http://localhost:8080/news/city-madrid</link>
                        <description>Champions League match preview.</description>
                    </item>
                </channel>
                </rss>
                """;
        stubFeed(rssContent);

        CrawlService.CrawlResult result = crawlService.crawl();
        assertThat(result.saved()).isEqualTo(1); // NBA article should be skipped!
        assertThat(result.skipped()).isGreaterThanOrEqualTo(1);

        List<NewsArticle> savedArticles = articleRepository.findAll().stream()
                .filter(a -> a.getSourceUrl() != null && a.getSourceUrl().startsWith("http://localhost:8080/news/"))
                .toList();
        assertThat(savedArticles).extracting(NewsArticle::getTitle)
                .containsExactly("Man City vs Real Madrid preview");
    }

    @Test
    public void testDeduplicationByUrlAndHash() {
        String feedContent = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0">
                <channel>
                    <item>
                        <title>Same Article Title</title>
                        <link>http://localhost:8080/news/same-article</link>
                        <description>Same content</description>
                        <pubDate>Fri, 03 Jul 2026 12:00:00 GMT</pubDate>
                    </item>
                </channel>
                </rss>
                """;
        stubFeed(feedContent);

        // First crawl
        CrawlService.CrawlResult first = crawlService.crawl();
        assertThat(first.saved()).isEqualTo(1);

        // Second crawl (same content, same URL) - lock cooldown bypassed by manual clock resetting
        activeSource.setLastCrawledAt(null);
        sourceRepository.saveAndFlush(activeSource);

        CrawlService.CrawlResult second = crawlService.crawl();
        assertThat(second.saved()).isEqualTo(0); // Deduplicated!
        assertThat(second.skipped()).isGreaterThanOrEqualTo(1);
    }

    @Test
    public void testCrawlConcurrencyLock() {
        String rssContent = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0">
                <channel>
                    <item>
                        <title>Haaland shines</title>
                        <link>http://localhost:8080/news/haaland</link>
                        <description>Haaland scored.</description>
                    </item>
                </channel>
                </rss>
                """;
        stubFeed(rssContent);

        // Manually set lastCrawledAt to now so lock cannot be acquired (cooldown is 1 hour)
        activeSource.setLastCrawledAt(Instant.now());
        sourceRepository.saveAndFlush(activeSource);

        // Crawl
        CrawlService.CrawlResult result = crawlService.crawl();
        assertThat(result.saved()).isEqualTo(0); // Skipped because of lock cooldown!
        assertThat(result.skipped()).isGreaterThanOrEqualTo(1);
    }

    @Test
    public void testCrawlScrapesFullArticleSuccessfully() {
        String rssContent = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0">
                <channel>
                    <item>
                        <title>Full Article Scrape Check</title>
                        <link>http://localhost:8080/news/full-article</link>
                        <description>This is only the short description.</description>
                    </item>
                </channel>
                </rss>
                """;
        stubFeed(rssContent);

        // Stub the scraper to return full scraped HTML body
        when(mockHtmlScraper.scrape(eq("http://localhost:8080/news/full-article"), eq("This is only the short description.")))
                .thenReturn("<p>First full paragraph.</p><p>Second full paragraph.</p>");

        CrawlService.CrawlResult result = crawlService.crawl();
        assertThat(result.saved()).isEqualTo(1);

        List<NewsArticle> savedArticles = articleRepository.findAll().stream()
                .filter(a -> a.getSourceUrl() != null && a.getSourceUrl().equals("http://localhost:8080/news/full-article"))
                .toList();
        assertThat(savedArticles).hasSize(1);
        assertThat(savedArticles.get(0).getSummary()).isEqualTo("This is only the short description.");
        // sanitizer normalizes <p>...</p> — Jsoup.clean with relaxed whitelist keeps p tags
        assertThat(savedArticles.get(0).getContent()).contains("First full paragraph").contains("Second full paragraph");
    }

    @Test
    public void testCrawlPersistsRssMediaInArticleContent() {
        String rssContent = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
                <channel>
                    <item>
                        <title>Match highlights video</title>
                        <link>http://localhost:8080/news/match-highlights-video</link>
                        <description>Football highlights from the match.</description>
                        <media:thumbnail url="https://cdn.example.com/highlights.jpg" />
                        <media:content medium="video" type="video/mp4" url="https://cdn.example.com/highlights.mp4" />
                    </item>
                </channel>
                </rss>
                """;
        stubFeed(rssContent);
        when(mockHtmlScraper.scrape(eq("http://localhost:8080/news/match-highlights-video"), anyString()))
                .thenReturn("<p>Full football highlights report.</p>");

        CrawlService.CrawlResult result = crawlService.crawl();

        NewsArticle article = articleRepository.findBySourceUrl("http://localhost:8080/news/match-highlights-video")
                .orElseThrow();
        assertThat(result.saved()).isEqualTo(1);
        assertThat(article.getContent()).contains("<video");
        assertThat(article.getContent()).contains("src=\"https://cdn.example.com/highlights.mp4\"");
        assertThat(article.getContent()).contains("poster=\"https://cdn.example.com/highlights.jpg\"");
    }

    @Test
    public void testCrawlRepairsExistingShortRssContent() {
        String link = "http://localhost:8080/news/repair-existing";
        NewsArticle existing = new NewsArticle();
        existing.setTitle("Repair Existing Article");
        existing.setSlug("repair-existing-article");
        existing.setSummary("<a href=\"" + link + "\"><img src=\"thumb.jpg\" /></a> Clean summary");
        existing.setContent("Clean summary");
        existing.setSource(activeSource);
        existing.setSourceUrl(link);
        existing.setContentHash("old-hash");
        existing.setStatus(ArticleStatus.PUBLISHED);
        existing.setPublishedAt(Instant.now());
        articleRepository.saveAndFlush(existing);
        activeSource.setLastCrawledAt(Instant.now());
        sourceRepository.saveAndFlush(activeSource);

        String rssContent = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0">
                <channel>
                    <item>
                        <title>Repair Existing Article</title>
                        <link>http://localhost:8080/news/repair-existing</link>
                        <description><![CDATA[<a href="http://localhost:8080/news/repair-existing"><img src="thumb.jpg" /></a> Clean summary]]></description>
                    </item>
                </channel>
                </rss>
                """;
        stubFeed(rssContent);
        when(mockHtmlScraper.scrape(eq(link), eq("Clean summary")))
                .thenReturn("<p>Full repaired article paragraph with enough detail.</p><p>Second repaired paragraph.</p>");

        CrawlService.CrawlResult result = crawlService.crawl(true);

        NewsArticle repaired = articleRepository.findBySourceUrl(link).orElseThrow();
        assertThat(result.saved()).isEqualTo(0);
        assertThat(result.repaired()).isEqualTo(1);
        assertThat(repaired.getSummary()).isEqualTo("Clean summary");
        assertThat(repaired.getContent()).contains("Full repaired article paragraph");
    }
}
