package com.footballverse.crawl;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RssParserTest {
    @Test
    void extractsThumbnailAndVideoMediaFromFeedItem() throws Exception {
        String rss = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
                  <channel>
                    <item>
                      <title>City win the final</title>
                      <link>https://example.com/news/city-final</link>
                      <description>City lift the trophy.</description>
                      <media:thumbnail url="https://cdn.example.com/thumb.jpg" />
                      <media:content medium="video" type="video/mp4" url="https://cdn.example.com/highlights.mp4" />
                    </item>
                  </channel>
                </rss>
                """;

        List<RssParser.CrawledItem> items = RssParser.parse(
                new ByteArrayInputStream(rss.getBytes(StandardCharsets.UTF_8)));

        assertThat(items).hasSize(1);
        assertThat(items.get(0).thumbnailUrl()).isEqualTo("https://cdn.example.com/thumb.jpg");
        assertThat(items.get(0).videoUrl()).isEqualTo("https://cdn.example.com/highlights.mp4");
    }

    @Test
    void fallsBackToDescriptionImageWhenFeedMediaIsMissing() throws Exception {
        String rss = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0">
                  <channel>
                    <item>
                      <title>United transfer update</title>
                      <link>https://example.com/news/united-transfer</link>
                      <description><![CDATA[<p>Transfer story.</p><img src="https://cdn.example.com/player.jpg" />]]></description>
                    </item>
                  </channel>
                </rss>
                """;

        List<RssParser.CrawledItem> items = RssParser.parse(
                new ByteArrayInputStream(rss.getBytes(StandardCharsets.UTF_8)));

        assertThat(items).hasSize(1);
        assertThat(items.get(0).thumbnailUrl()).isEqualTo("https://cdn.example.com/player.jpg");
    }
}
