package com.footballverse.common.text;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RichTextSanitizerTest {

    @Test
    void removesScriptTagsAndInlineHandlers() {
        RichTextSanitizer sanitizer = new RichTextSanitizer();

        String result = sanitizer.sanitize("<p onclick=\"bad()\">ok</p><script>alert(1)</script>");

        assertThat(result).isEqualTo("<p>ok</p>");
    }
}
