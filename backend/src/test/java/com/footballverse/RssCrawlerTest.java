package com.footballverse;

import com.footballverse.news.ArticleStatus;
import com.footballverse.news.CrawlService;
import com.footballverse.news.NewsArticle;
import com.footballverse.news.NewsArticleRepository;
import com.footballverse.news.NewsSource;
import com.footballverse.news.NewsSourceRepository;
import com.footballverse.news.NewsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import org.springframework.boot.test.mock.mockito.MockBean;
import com.footballverse.news.HtmlContentScraper;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@SpringBootTest
@Transactional
public class RssCrawlerTest {

    static {
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    @Autowired
    private NewsSourceRepository sourceRepository;

    @Autowired
    private NewsArticleRepository articleRepository;

    @Autowired
    private NewsService newsService;

    @Autowired
    private CrawlService crawlService;

    @MockBean
    private HtmlContentScraper mockHtmlScraper;

    private RestTemplate mockRestTemplate;
    private NewsSource activeSource;

    @BeforeEach
    public void setup() {
        mockRestTemplate = mock(RestTemplate.class);
        crawlService.setRestTemplate(mockRestTemplate);

        // Mock default behavior for html scraper to return the fallback description
        when(mockHtmlScraper.scrape(anyString(), anyString())).thenAnswer(invocation -> invocation.getArgument(1));

        // Retrieve or create the test source dynamically
        activeSource = sourceRepository.findByFeedUrl("http://localhost:8080/mock-rss")
                .orElseGet(() -> {
                    NewsSource src = new NewsSource("Test RSS Feed", "http://localhost:8080/mock-rss");
                    src.setActive(true);
                    return sourceRepository.save(src);
                });
        activeSource.setActive(true);
        activeSource.setLastCrawledAt(null);
        activeSource = sourceRepository.saveAndFlush(activeSource);
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

        when(mockRestTemplate.getForObject("http://localhost:8080/mock-rss", byte[].class))
                .thenReturn(rssContent.getBytes(StandardCharsets.UTF_8));

        int savedCount = newsService.crawl();
        assertThat(savedCount).isEqualTo(2);

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

        when(mockRestTemplate.getForObject("http://localhost:8080/mock-rss", byte[].class))
                .thenReturn(atomContent.getBytes(StandardCharsets.UTF_8));

        int savedCount = newsService.crawl();
        assertThat(savedCount).isEqualTo(1);

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

        when(mockRestTemplate.getForObject("http://localhost:8080/mock-rss", byte[].class))
                .thenReturn(rssContent.getBytes(StandardCharsets.UTF_8));

        int savedCount = newsService.crawl();
        assertThat(savedCount).isEqualTo(1);

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

        when(mockRestTemplate.getForObject("http://localhost:8080/mock-rss", byte[].class))
                .thenReturn(rssContent.getBytes(StandardCharsets.UTF_8));

        int savedCount = newsService.crawl();
        assertThat(savedCount).isEqualTo(1); // NBA article should be skipped!

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

        when(mockRestTemplate.getForObject("http://localhost:8080/mock-rss", byte[].class))
                .thenReturn(feedContent.getBytes(StandardCharsets.UTF_8));

        // First crawl
        int count1 = newsService.crawl();
        assertThat(count1).isEqualTo(1);

        // Second crawl (same content, same URL) - lock cooldown bypassed by manual clock resetting
        activeSource.setLastCrawledAt(null);
        sourceRepository.saveAndFlush(activeSource);

        int count2 = newsService.crawl();
        assertThat(count2).isEqualTo(0); // Deduplicated!
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

        when(mockRestTemplate.getForObject("http://localhost:8080/mock-rss", byte[].class))
                .thenReturn(rssContent.getBytes(StandardCharsets.UTF_8));

        // Manually set lastCrawledAt to now so lock cannot be acquired (cooldown is 1 hour)
        activeSource.setLastCrawledAt(Instant.now());
        sourceRepository.saveAndFlush(activeSource);

        // Crawl
        int savedCount = newsService.crawl();
        assertThat(savedCount).isEqualTo(0); // Skipped because of lock cooldown!
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

        when(mockRestTemplate.getForObject("http://localhost:8080/mock-rss", byte[].class))
                .thenReturn(rssContent.getBytes(StandardCharsets.UTF_8));
        
        // Stub the scraper to return full scraped HTML body
        when(mockHtmlScraper.scrape(eq("http://localhost:8080/news/full-article"), eq("This is only the short description.")))
                .thenReturn("<p>First full paragraph.</p><p>Second full paragraph.</p>");

        int savedCount = newsService.crawl();
        assertThat(savedCount).isEqualTo(1);

        List<NewsArticle> savedArticles = articleRepository.findAll().stream()
                .filter(a -> a.getSourceUrl() != null && a.getSourceUrl().equals("http://localhost:8080/news/full-article"))
                .toList();
        assertThat(savedArticles).hasSize(1);
        assertThat(savedArticles.get(0).getSummary()).isEqualTo("This is only the short description.");
        assertThat(savedArticles.get(0).getContent()).isEqualTo("<p>First full paragraph.</p><p>Second full paragraph.</p>");
    }
}
