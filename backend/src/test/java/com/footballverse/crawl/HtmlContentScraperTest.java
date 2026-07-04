package com.footballverse.crawl;

import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HtmlContentScraperTest {
    @Test
    void extractsArticleBodyFromJsonLdBeforeRssFallback() {
        HtmlContentScraper scraper = new HtmlContentScraper();
        String html = """
                <html><head>
                  <script type="application/ld+json">
                    {"@type":"NewsArticle","articleBody":"First full paragraph.\\n\\nSecond full paragraph with more detail."}
                  </script>
                </head><body><p>Short RSS summary.</p></body></html>
                """;

        String content = scraper.extract("goal.com", Jsoup.parse(html), "Short RSS summary.");

        assertThat(content).contains("First full paragraph");
        assertThat(content).contains("Second full paragraph with more detail");
    }

    @Test
    void extractsLongBodyFromApplicationJsonScript() {
        HtmlContentScraper scraper = new HtmlContentScraper();
        String html = """
                <html><head>
                  <script id="__NEXT_DATA__" type="application/json">
                    {"props":{"pageProps":{"article":{"content":"<p>Short summary.</p><p>Full body from app data with more usable detail.</p><p>Another paragraph from the article body.</p>"}}}}
                  </script>
                </head><body><article><p>Short summary.</p></article></body></html>
                """;

        String content = scraper.extract("goal.com", Jsoup.parse(html), "Short summary.");

        assertThat(content).contains("Full body from app data");
        assertThat(content).contains("Another paragraph");
    }

    @Test
    void keepsOpenGraphImageWhenStructuredTextWins() {
        HtmlContentScraper scraper = new HtmlContentScraper();
        String html = """
                <html><head>
                  <meta property="og:image" content="https://cdn.example.com/hero.jpg">
                  <script type="application/ld+json">
                    {"@type":"NewsArticle","articleBody":"First full paragraph with enough detail.\\n\\nSecond full paragraph with more detail than the DOM body."}
                  </script>
                </head><body><article><p>Short body.</p></article></body></html>
                """;

        String content = scraper.extract("example.com", Jsoup.parse(html, "https://example.com/news/one"), "Short body.");

        assertThat(content).contains("<img src=\"https://cdn.example.com/hero.jpg\"");
        assertThat(content).contains("First full paragraph");
    }

    @Test
    void extractsLazyImagesAndIframesFromArticleDom() {
        HtmlContentScraper scraper = new HtmlContentScraper();
        String html = """
                <html><body>
                  <article>
                    <p>Long enough article paragraph about a football match.</p>
                    <img data-src="/images/match.jpg" alt="Match photo">
                    <iframe data-src="https://www.youtube.com/embed/abc123"></iframe>
                  </article>
                </body></html>
                """;

        String content = scraper.extract("example.com", Jsoup.parse(html, "https://example.com/news/one"), "");

        assertThat(content).contains("<img src=\"https://example.com/images/match.jpg\" alt=\"Match photo\" />");
        assertThat(content).contains("<iframe src=\"https://www.youtube.com/embed/abc123\"");
    }
}
