package com.footballverse.news;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.w3c.dom.Node;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.InputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public class RssParser {
    public record CrawledItem(String title, String link, String description, Instant pubDate) {}

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

        // Try RSS 2.0 first
        NodeList nodeList = doc.getElementsByTagName("item");
        if (nodeList.getLength() == 0) {
            // Try Atom
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

            // Description/Summary/Content
            String description = getChildTagValue(element, "description");
            if (description == null || description.isEmpty()) {
                description = getChildTagValue(element, "summary");
            }
            if (description == null || description.isEmpty()) {
                description = getChildTagValue(element, "content");
            }

            // Date
            String dateStr = getChildTagValue(element, "pubDate");
            if (dateStr == null || dateStr.isEmpty()) {
                dateStr = getChildTagValue(element, "updated");
            }
            if (dateStr == null || dateStr.isEmpty()) {
                dateStr = getChildTagValue(element, "published");
            }

            Instant pubDate = null;
            if (dateStr != null && !dateStr.isEmpty()) {
                String trimmed = dateStr.trim();
                for (DateTimeFormatter formatter : DATE_FORMATTERS) {
                    try {
                        pubDate = Instant.from(formatter.parse(trimmed));
                        break;
                    } catch (Exception ignored) {}
                }
            }
            if (pubDate == null) {
                pubDate = Instant.now();
            }

            if (title != null && link != null) {
                items.add(new CrawledItem(title.trim(), link.trim(), description != null ? description.trim() : "", pubDate));
            }
        }
        return items;
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
                String name = child.getLocalName();
                if (name == null) {
                    name = child.getTagName();
                    int colonIndex = name.indexOf(':');
                    if (colonIndex != -1) {
                        name = name.substring(colonIndex + 1);
                    }
                }
                if (name.equalsIgnoreCase(tagName)) {
                    return child;
                }
            }
        }
        return null;
    }
}
