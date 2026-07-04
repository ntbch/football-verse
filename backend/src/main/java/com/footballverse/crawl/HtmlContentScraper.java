package com.footballverse.crawl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;

@Component
@Slf4j
public class HtmlContentScraper {

    private static final String SCRAPER_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final int SCRAPER_TIMEOUT_MS = 10_000;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String scrape(String url, String fallbackDescription) {
        if (url == null || url.isBlank()) {
            return fallbackDescription;
        }
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent(SCRAPER_USER_AGENT)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .header("Connection", "keep-alive")
                    .header("Cache-Control", "max-age=0")
                    .timeout(SCRAPER_TIMEOUT_MS)
                    .followRedirects(true)
                    .get();

            return extract(URI.create(url).getHost(), doc, fallbackDescription);
        } catch (Exception e) {
            log.warn("Failed to scrape full article from url: {}. Error: {}", url, e.getMessage());
            return fallbackDescription;
        }
    }

    String extract(String host, Document doc, String fallbackDescription) {
        String best = fallbackDescription == null ? "" : fallbackDescription;
        best = better(best, extractStructuredBody(doc));

        if (host != null) {
            if (host.contains("goal.com")) {
                Element detail = doc.selectFirst(".article-body, [class*=\"article-body\"], article");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("transfermarkt")) {
                Element detail = doc.selectFirst(".news-text, .news_text, article");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("tribuna.com")) {
                Element detail = doc.selectFirst("article, [data-testid=\"article-content\"], .post-body");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("espn.com")) {
                Element detail = doc.selectFirst("[data-testid*=\"article\"], .article-body, article");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("bbci.co.uk") || host.contains("bbc.com")) {
                Element detail = doc.selectFirst("article, .story-body__inner");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("skysports")) {
                Element detail = doc.selectFirst("article, .article-body, [class*='article-body'], [class*='article__body']");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("90min")) {
                Element detail = doc.selectFirst("article, .article-body, .post-content");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("football365")) {
                Element detail = doc.selectFirst("article, .entry-content, .post-content");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("theathletic")) {
                Element detail = doc.selectFirst("article, [data-testid='article-body'], .article-content");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("theguardian")) {
                Element detail = doc.selectFirst("article, [itemprop='articleBody'], .content__article-body");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("mirror.co.uk")) {
                Element detail = doc.selectFirst("article, .article-body, .story-content, .article-content-inner");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("dailymail")) {
                Element detail = doc.selectFirst("article, .mol-article-body, .article-body, .article-text");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("independent")) {
                Element detail = doc.selectFirst("article, .article-body, .story-body, .content-text");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            } else if (host.contains("eurosport")) {
                Element detail = doc.selectFirst("article, .article-content, .article-body, .post-content");
                if (detail != null) best = better(best, cleanAndFormatHtml(detail));
            }
        }
        return withLeadMedia(doc, better(best, extractFallback(doc, fallbackDescription)));
    }

    private String extractFallback(Document doc, String fallbackDescription) {
        Element article = doc.selectFirst("article");
        if (article != null) return cleanAndFormatHtml(article);

        Element bestContainer = null;
        int maxParagraphs = 0;
        for (Element element : doc.select("div, section")) {
            int pCount = element.select("p").size();
            if (pCount > maxParagraphs) {
                maxParagraphs = pCount;
                bestContainer = element;
            }
        }
        if (bestContainer != null && maxParagraphs > 2) return cleanAndFormatHtml(bestContainer);
        return fallbackDescription;
    }

    private String cleanAndFormatHtml(Element container) {
        Elements elements = container.select("p, h2, h3, h4, img, video, iframe");
        StringBuilder sb = new StringBuilder();
        for (Element p : elements) {
            if (p.tagName().equals("img")) {
                String src = mediaUrl(p, "src");
                if (!src.isBlank()) {
                    String alt = p.attr("alt").trim();
                    sb.append("<img src=\"").append(escapeAttr(src)).append("\" alt=\"").append(escapeAttr(alt)).append("\" />");
                }
                continue;
            }
            if (p.tagName().equals("video")) {
                String src = mediaUrl(p, "src");
                String poster = mediaUrl(p, "poster");
                if (!src.isBlank()) {
                    sb.append("<video src=\"").append(escapeAttr(src)).append("\" controls");
                    if (!poster.isBlank()) sb.append(" poster=\"").append(escapeAttr(poster)).append("\"");
                    sb.append("></video>");
                } else {
                    Elements sources = p.select("source");
                    if (!sources.isEmpty()) {
                        sb.append("<video controls");
                        if (!poster.isBlank()) sb.append(" poster=\"").append(escapeAttr(poster)).append("\"");
                        sb.append(">");
                        for (Element srcTag : sources) {
                            String sUrl = mediaUrl(srcTag, "src");
                            if (sUrl.isBlank()) continue;
                            String type = srcTag.attr("type");
                            sb.append("<source src=\"").append(escapeAttr(sUrl)).append("\" type=\"").append(escapeAttr(type)).append("\">");
                        }
                        sb.append("</video>");
                    }
                }
                continue;
            }
            if (p.tagName().equals("iframe")) {
                String src = mediaUrl(p, "src");
                if (!src.isBlank()) {
                    sb.append("<iframe src=\"").append(escapeAttr(src)).append("\" width=\"100%\" height=\"400\" allowfullscreen></iframe>");
                }
                continue;
            }
            String text = p.text().trim();
            if (text.isEmpty() || text.length() < 10) continue;
            if (text.toLowerCase().contains("xem thêm") || text.toLowerCase().contains("related posts") || text.toLowerCase().contains("chia sẻ")) continue;
            if (p.tagName().startsWith("h")) {
                sb.append("<h3>").append(text).append("</h3>");
            } else {
                sb.append("<p>").append(text).append("</p>");
            }
        }
        String content = sb.toString().trim();
        return content.isEmpty() ? container.html() : content;
    }

    private String extractStructuredBody(Document doc) {
        String best = "";
        for (Element script : doc.select("script[type=application/ld+json], script[type=application/json], script#__NEXT_DATA__")) {
            try {
                String body = findBestArticleText(objectMapper.readTree(script.html()));
                if (body.length() > best.length()) best = body;
            } catch (Exception ignored) {
            }
        }
        return formatPlainText(best);
    }

    private String findBestArticleText(JsonNode node) {
        String best = "";
        for (String fieldName : List.of("articleBody", "body", "content", "text")) {
            String value = findText(node, fieldName);
            if (value.length() > best.length()) best = value;
        }
        return best;
    }

    private String findText(JsonNode node, String fieldName) {
        if (node == null) return "";
        if (node.isObject()) {
            JsonNode direct = node.get(fieldName);
            if (direct != null && direct.isTextual()) return Jsoup.parse(direct.asText()).text();
            String best = "";
            var fields = node.fields();
            while (fields.hasNext()) {
                String value = findText(fields.next().getValue(), fieldName);
                if (value.length() > best.length()) best = value;
            }
            return best;
        }
        if (node.isArray()) {
            String best = "";
            for (JsonNode child : node) {
                String value = findText(child, fieldName);
                if (value.length() > best.length()) best = value;
            }
            return best;
        }
        return "";
    }

    private String better(String current, String candidate) {
        if (candidate == null || candidate.isBlank()) return current;
        int candidateTextLength = Jsoup.parse(candidate).text().length();
        int currentTextLength = Jsoup.parse(current).text().length();
        if (hasMedia(candidate) && !hasMedia(current) && candidateTextLength >= Math.min(120, currentTextLength * 0.6)) {
            return candidate;
        }
        return candidateTextLength > currentTextLength ? candidate : current;
    }

    private String formatPlainText(String text) {
        if (text == null || text.isBlank()) return "";
        StringBuilder sb = new StringBuilder();
        for (String paragraph : text.split("\\R{2,}")) {
            String trimmed = paragraph.replaceAll("\\s+", " ").trim();
            if (!trimmed.isBlank()) sb.append("<p>").append(trimmed).append("</p>");
        }
        return sb.toString();
    }

    private String withLeadMedia(Document doc, String content) {
        if (hasMedia(content)) return content;

        String videoUrl = firstMetaContent(doc,
                "meta[property='og:video:secure_url']",
                "meta[property='og:video']",
                "meta[name='twitter:player']");
        if (videoUrl.isBlank()) videoUrl = extractStructuredVideo(doc);
        if (videoUrl.isBlank()) videoUrl = firstDomMediaUrl(doc, "article video, [class*=article] video, [class*=content] video", "src");
        if (videoUrl.isBlank()) videoUrl = firstDomMediaUrl(doc, "article iframe, [class*=article] iframe, [class*=content] iframe", "src");
        if (!videoUrl.isBlank()) {
            String poster = firstImageCandidate(doc);
            if (isEmbeddable(videoUrl)) {
                return "<iframe src=\"" + escapeAttr(videoUrl) + "\" width=\"100%\" height=\"400\" allowfullscreen></iframe>" + content;
            }
            String posterAttr = poster.isBlank() ? "" : " poster=\"" + escapeAttr(poster) + "\"";
            return "<video src=\"" + escapeAttr(videoUrl) + "\" controls" + posterAttr + "></video>" + content;
        }

        String imageUrl = firstImageCandidate(doc);
        if (!imageUrl.isBlank()) {
            String alt = doc.title() == null ? "" : doc.title();
            return "<img src=\"" + escapeAttr(imageUrl) + "\" alt=\"" + escapeAttr(alt) + "\" />" + content;
        }
        return content;
    }

    private String firstImageCandidate(Document doc) {
        String imageUrl = firstMetaContent(doc,
                "meta[property='og:image:secure_url']",
                "meta[property='og:image']",
                "meta[name='twitter:image']",
                "meta[name='twitter:image:src']");
        if (imageUrl.isBlank()) imageUrl = extractStructuredImage(doc);
        if (imageUrl.isBlank()) {
            imageUrl = firstDomMediaUrl(doc,
                    "article img, [class*=article] img, [class*=content] img, [itemprop=image], img[src], img[data-src]",
                    "src");
        }
        return imageUrl;
    }

    private String firstMetaContent(Document doc, String... selectors) {
        for (String selector : selectors) {
            Element meta = doc.selectFirst(selector);
            if (meta == null) continue;
            String value = meta.absUrl("content");
            if (value.isBlank()) value = meta.attr("content");
            if (!value.isBlank()) return value.trim();
        }
        return "";
    }

    private String firstDomMediaUrl(Document doc, String selector, String attr) {
        for (Element element : doc.select(selector)) {
            String url = mediaUrl(element, attr);
            if (!url.isBlank() && !url.startsWith("data:")) return url;
        }
        return "";
    }

    private String mediaUrl(Element element, String attr) {
        String url = element.absUrl(attr);
        if (url.isBlank()) url = element.attr(attr);
        if (url.isBlank()) url = lazyUrl(element);
        if (url.isBlank() && "src".equals(attr)) url = firstSrcsetUrl(element);
        return url == null ? "" : url.trim();
    }

    private String lazyUrl(Element element) {
        for (String attr : List.of("data-src", "data-lazy-src", "data-original", "data-url")) {
            String url = element.absUrl(attr);
            if (url.isBlank()) url = element.attr(attr);
            if (!url.isBlank()) return url.trim();
        }
        return "";
    }

    private String firstSrcsetUrl(Element element) {
        for (String attr : List.of("srcset", "data-srcset")) {
            String srcset = element.attr(attr);
            if (srcset.isBlank()) continue;
            String first = srcset.split(",")[0].trim().split("\\s+")[0];
            if (!first.isBlank()) return first;
        }
        return "";
    }

    private String extractStructuredImage(Document doc) {
        String best = "";
        for (Element script : doc.select("script[type=application/ld+json], script[type=application/json], script#__NEXT_DATA__")) {
            try {
                String image = findStructuredImage(objectMapper.readTree(script.html()));
                if (image.length() > best.length()) best = image;
            } catch (Exception ignored) {
            }
        }
        return best;
    }

    private String extractStructuredVideo(Document doc) {
        String best = "";
        for (Element script : doc.select("script[type=application/ld+json], script[type=application/json], script#__NEXT_DATA__")) {
            try {
                String video = findStructuredVideo(objectMapper.readTree(script.html()));
                if (video.length() > best.length()) best = video;
            } catch (Exception ignored) {
            }
        }
        return best;
    }

    private String findStructuredImage(JsonNode node) {
        if (node == null) return "";
        if (node.isObject()) {
            String direct = mediaNodeValue(node.get("image"));
            if (direct.isBlank()) direct = mediaNodeValue(node.get("thumbnailUrl"));
            if (!direct.isBlank()) return direct;
            String best = "";
            var fields = node.fields();
            while (fields.hasNext()) {
                String value = findStructuredImage(fields.next().getValue());
                if (value.length() > best.length()) best = value;
            }
            return best;
        }
        if (node.isArray()) {
            String best = "";
            for (JsonNode child : node) {
                String value = findStructuredImage(child);
                if (value.length() > best.length()) best = value;
            }
            return best;
        }
        return "";
    }

    private String findStructuredVideo(JsonNode node) {
        if (node == null) return "";
        if (node.isObject()) {
            if (isType(node, "VideoObject")) {
                String direct = mediaNodeValue(node.get("contentUrl"));
                if (direct.isBlank()) direct = mediaNodeValue(node.get("embedUrl"));
                if (!direct.isBlank()) return direct;
            }
            String nested = mediaNodeValue(node.get("video"));
            if (!nested.isBlank()) return nested;
            String best = "";
            var fields = node.fields();
            while (fields.hasNext()) {
                String value = findStructuredVideo(fields.next().getValue());
                if (value.length() > best.length()) best = value;
            }
            return best;
        }
        if (node.isArray()) {
            String best = "";
            for (JsonNode child : node) {
                String value = findStructuredVideo(child);
                if (value.length() > best.length()) best = value;
            }
            return best;
        }
        return "";
    }

    private boolean isType(JsonNode node, String type) {
        JsonNode typeNode = node.get("@type");
        if (typeNode == null) return false;
        if (typeNode.isTextual()) return type.equalsIgnoreCase(typeNode.asText());
        if (typeNode.isArray()) {
            for (JsonNode value : typeNode) {
                if (value.isTextual() && type.equalsIgnoreCase(value.asText())) return true;
            }
        }
        return false;
    }

    private String mediaNodeValue(JsonNode node) {
        if (node == null) return "";
        if (node.isTextual()) return node.asText().trim();
        if (node.isArray()) {
            for (JsonNode child : node) {
                String value = mediaNodeValue(child);
                if (!value.isBlank()) return value;
            }
        }
        if (node.isObject()) {
            for (String field : List.of("url", "contentUrl", "embedUrl")) {
                String value = mediaNodeValue(node.get(field));
                if (!value.isBlank()) return value;
            }
        }
        return "";
    }

    private boolean hasMedia(String html) {
        if (html == null || html.isBlank()) return false;
        return Jsoup.parse(html).selectFirst("img[src], video[src], video source[src], iframe[src]") != null;
    }

    private boolean isEmbeddable(String url) {
        String lower = url.toLowerCase();
        return lower.contains("youtube.com/embed/")
                || lower.contains("youtube.com/watch")
                || lower.contains("youtu.be/")
                || lower.contains("vimeo.com");
    }

    static String escapeAttr(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("\"", "&quot;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
