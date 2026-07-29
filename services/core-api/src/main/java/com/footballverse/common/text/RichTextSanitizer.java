package com.footballverse.common.text;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

@Component
public class RichTextSanitizer {

    private static final Set<String> EMBED_HOSTS = Set.of(
            "youtube.com", "www.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "players.brightcove.net"
    );

    // ponytail: jsoup Safelist là trust boundary — OWASP sanitizer không cần.
    // Safelist.relaxed() keeps p, h1-h6, a, img, b, i, em, strong, ul, ol, li, br, etc.
    // Strip unwanted tags + remove dangerous protocols.
    private static final Safelist SAFELIST = Safelist.relaxed()
            .removeTags("div", "span", "blockquote", "code", "pre", "dl", "dt", "dd", "cite",
                "q", "dfn", "abbr", "time", "data", "s", "u", "sub", "sup", "ruby", "rt", "rp",
                "wbr", "ins", "del", "kbd", "var", "samp", "table", "thead", "tbody", "tfoot",
                "tr", "td", "th", "col", "colgroup", "caption", "article", "aside", "header",
                "footer", "nav", "section", "main", "details", "summary", "figure", "figcaption",
                "hr", "style", "label", "input", "button", "fieldset", "legend", "object",
                "embed", "param", "script", "noscript")
            .removeAttributes("a", "target", "rel")
            .removeAttributes("img", "srcset")
            .removeProtocols("a", "href", "javascript", "data")
            .addProtocols("a", "href", "http", "https", "mailto")
            .addTags("iframe", "video", "source")
            .addAttributes("iframe", "src", "width", "height", "frameborder", "allow", "allowfullscreen")
            .addAttributes("video", "src", "controls", "poster", "width", "height")
            .addAttributes("source", "src", "type")
            .addProtocols("iframe", "src", "http", "https")
            .addProtocols("video", "src", "http", "https")
            .addProtocols("source", "src", "http", "https")
            // ponytail: don't removeProtocols on img src — jsoup 1.18 strips the attr entirely
            // when removeProtocols is called even with an irrelevant protocol on a bare src
            .addProtocols("img", "src", "http", "https");

    private static final Document.OutputSettings OUTPUT_SETTINGS = new Document.OutputSettings().prettyPrint(false);

    public String sanitize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        Document document = Jsoup.parseBodyFragment(Jsoup.clean(value, "", SAFELIST, OUTPUT_SETTINGS));
        document.select("iframe[src]").removeIf(frame -> !allowedEmbed(frame));
        return document.body().html();
    }

    private boolean allowedEmbed(Element frame) {
        try {
            URI uri = URI.create(frame.attr("src"));
            return "https".equalsIgnoreCase(uri.getScheme())
                    && uri.getHost() != null
                    && EMBED_HOSTS.contains(uri.getHost().toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }
}
