package com.footballverse.crawl;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.InputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public class RssParser {
    public record CrawledItem(String title, String link, String description, Instant pubDate,
                             String encodedContent, String thumbnailUrl, String author, String videoUrl,
                             List<String> categories) {
        public CrawledItem {
            if (categories == null) categories = List.of();
        }

        public CrawledItem(String title, String link, String description, Instant pubDate) {
            this(title, link, description, pubDate, null, null, null, null, List.of());
        }

        public CrawledItem(String title, String link, String description, Instant pubDate,
                           String encodedContent, String thumbnailUrl, String author, List<String> categories) {
            this(title, link, description, pubDate, encodedContent, thumbnailUrl, author, null, categories);
        }
    }

    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter[] DATE_FORMATTERS = {
        DateTimeFormatter.RFC_1123_DATE_TIME,
        DateTimeFormatter.ISO_DATE_TIME,
        DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss").withZone(DEFAULT_ZONE),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(DEFAULT_ZONE),
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss").withZone(DEFAULT_ZONE),
        DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss").withZone(DEFAULT_ZONE),
        DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm").withZone(DEFAULT_ZONE),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(DEFAULT_ZONE)
    };

    public static List<CrawledItem> parse(InputStream in) throws Exception {
        List<CrawledItem> items = new ArrayList<>();
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(in);

        NodeList nodeList = doc.getElementsByTagName("item");
        if (nodeList.getLength() == 0) {
            nodeList = doc.getElementsByTagName("entry");
        }

        for (int i = 0; i < nodeList.getLength(); i++) {
            Element element = (Element) nodeList.item(i);

            String title = getChildTagValue(element, "title");

            String link = null;
            Element linkEl = getChildElement(element, "link");
            if (linkEl != null) {
                link = linkEl.getTextContent();
                if (link == null || link.trim().isEmpty()) {
                    link = linkEl.getAttribute("href");
                }
            }

            String description = getChildTagValue(element, "description");
            if (description == null || description.isEmpty()) description = getChildTagValue(element, "summary");
            if (description == null || description.isEmpty()) description = getChildTagValue(element, "content");

            String dateStr = getChildTagValue(element, "pubDate");
            if (dateStr == null || dateStr.isEmpty()) dateStr = getChildTagValue(element, "updated");
            if (dateStr == null || dateStr.isEmpty()) dateStr = getChildTagValue(element, "published");

            Instant pubDate = null;
            if (dateStr != null && !dateStr.isEmpty()) {
                String trimmed = dateStr.trim();
                for (DateTimeFormatter formatter : DATE_FORMATTERS) {
                    try { pubDate = Instant.from(formatter.parse(trimmed)); break; } catch (Exception ignored) {}
                }
            }
            if (pubDate == null) pubDate = Instant.now();

            // Enh 3: extra metadata. localName fallback in getChildElement already strips prefixes
            // (content:encoded -> encoded, dc:creator -> creator, media:thumbnail -> thumbnail).
            String encodedContent = getChildTagValue(element, "encoded");
            String author = getChildTagValue(element, "creator");
            String thumbnailUrl = extractThumbnail(element);
            String videoUrl = extractVideo(element);
            List<String> categories = extractCategories(element);

            if (title != null && link != null) {
                items.add(new CrawledItem(
                        title.trim(), link.trim(),
                        description != null ? description.trim() : "",
                        pubDate, encodedContent, thumbnailUrl, author, videoUrl, categories));
            }
        }
        return items;
    }

    private static String extractThumbnail(Element element) {
        for (Element thumb : descendantElements(element, "thumbnail")) {
            String url = thumb.getAttribute("url");
            if (url != null && !url.isBlank()) return url.trim();
        }
        for (Element content : descendantElements(element, "content")) {
            String medium = content.getAttribute("medium");
            String type = content.getAttribute("type");
            if ("image".equalsIgnoreCase(medium) || (type != null && type.startsWith("image/"))) {
                String url = content.getAttribute("url");
                if (url != null && !url.isBlank()) return url.trim();
            }
        }
        for (Element enclosure : descendantElements(element, "enclosure")) {
            String type = enclosure.getAttribute("type");
            if (type != null && type.startsWith("image/")) {
                String url = enclosure.getAttribute("url");
                if (url != null && !url.isBlank()) return url.trim();
            }
        }
        String descriptionImage = firstImageFromHtml(getChildTagValue(element, "description"));
        if (descriptionImage != null) return descriptionImage;
        return firstImageFromHtml(getChildTagValue(element, "encoded"));
    }

    private static String extractVideo(Element element) {
        for (Element content : descendantElements(element, "content")) {
            String medium = content.getAttribute("medium");
            String type = content.getAttribute("type");
            if ("video".equalsIgnoreCase(medium) || (type != null && type.startsWith("video/"))) {
                String url = content.getAttribute("url");
                if (url != null && !url.isBlank()) return url.trim();
            }
        }
        for (Element player : descendantElements(element, "player")) {
            String url = player.getAttribute("url");
            if (url != null && !url.isBlank()) return url.trim();
        }
        for (Element enclosure : descendantElements(element, "enclosure")) {
            String type = enclosure.getAttribute("type");
            if (type != null && type.startsWith("video/")) {
                String url = enclosure.getAttribute("url");
                if (url != null && !url.isBlank()) return url.trim();
            }
        }
        return null;
    }

    private static List<String> extractCategories(Element element) {
        List<String> cats = new ArrayList<>();
        NodeList children = element.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node node = children.item(i);
            if (node.getNodeType() != Node.ELEMENT_NODE) continue;
            Element child = (Element) node;
            String name = child.getLocalName();
            if (name == null) {
                name = child.getTagName();
                int colonIndex = name.indexOf(':');
                if (colonIndex != -1) name = name.substring(colonIndex + 1);
            }
            if (name.equalsIgnoreCase("category")) {
                String term = child.getAttribute("term");
                String text = (term != null && !term.isBlank()) ? term : child.getTextContent();
                if (text != null && !text.isBlank()) cats.add(text.trim());
            }
        }
        return cats;
    }

    private static String getChildTagValue(Element parent, String tagName) {
        Element child = getChildElement(parent, tagName);
        return child != null ? child.getTextContent() : null;
    }

    private static Element getChildElement(Element parent, String tagName) {
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node node = children.item(i);
            if (node.getNodeType() == Node.ELEMENT_NODE) {
                Element child = (Element) node;
                if (localName(child).equalsIgnoreCase(tagName)) return child;
            }
        }
        return null;
    }

    private static List<Element> descendantElements(Element parent, String tagName) {
        List<Element> matches = new ArrayList<>();
        NodeList descendants = parent.getElementsByTagName("*");
        for (int i = 0; i < descendants.getLength(); i++) {
            Node node = descendants.item(i);
            if (node.getNodeType() == Node.ELEMENT_NODE) {
                Element child = (Element) node;
                if (localName(child).equalsIgnoreCase(tagName)) matches.add(child);
            }
        }
        return matches;
    }

    private static String localName(Element element) {
        String name = element.getLocalName();
        if (name == null) {
            name = element.getTagName();
            int colonIndex = name.indexOf(':');
            if (colonIndex != -1) name = name.substring(colonIndex + 1);
        }
        return name;
    }

    private static String firstImageFromHtml(String html) {
        if (html == null || html.isBlank()) return null;
        org.jsoup.nodes.Element image = org.jsoup.Jsoup.parse(html).selectFirst("img[src], img[data-src]");
        if (image == null) return null;
        String src = image.hasAttr("src") ? image.attr("src") : image.attr("data-src");
        return src == null || src.isBlank() ? null : src.trim();
    }
}
