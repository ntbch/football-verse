package com.footballverse.common.text;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RichTextSanitizerTest {

    private final RichTextSanitizer sanitizer = new RichTextSanitizer();

    @Test
    void removesScriptTagsAndInlineHandlers() {
        assertThat(sanitizer.sanitize("<p onclick=\"bad()\">ok</p><script>alert(1)</script>"))
                .isEqualTo("<p>ok</p>");
    }

    @Test
    void stripsImgOnerrorButKeepsSrc() {
        // ponytail: jsoup drops protocol-less src — real articles always have absolute URLs.
        String result = sanitizer.sanitize("<img src=\"https://cdn.example.com/hero.jpg\" onerror=\"alert(1)\">");
        assertThat(result).contains("src=\"https://cdn.example.com/hero.jpg\"");
        assertThat(result).doesNotContain("onerror");
    }

    @Test
    void blocksJavascriptUrlInAnchor() {
        String result = sanitizer.sanitize("<a href=\"javascript:alert(1)\">x</a>");
        assertThat(result).doesNotContain("javascript:");
        assertThat(result).contains("x");
    }

    @Test
    void stripsSvgAndPreservesSafeIframe() {
        assertThat(sanitizer.sanitize("<svg onload=\"alert(1)\"><circle/></svg>")).isEmpty();
        assertThat(sanitizer.sanitize("<iframe src=\"https://www.youtube.com/embed/123\"></iframe>"))
                .isEqualTo("<iframe src=\"https://www.youtube.com/embed/123\"></iframe>");
    }

    @Test
    void keepsInnerParagraphStripsWrapperDivAndScript() {
        assertThat(sanitizer.sanitize("<div><p>keep</p><script>bad</script></div>"))
                .isEqualTo("<p>keep</p>");
    }
}
