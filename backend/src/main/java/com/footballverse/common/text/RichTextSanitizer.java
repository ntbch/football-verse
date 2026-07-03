package com.footballverse.common.text;

import org.springframework.stereotype.Component;

@Component
public class RichTextSanitizer {

    public String sanitize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        // ponytail: naive sanitizer, swap for OWASP Java HTML Sanitizer when rich embeds are enabled.
        return value
                .replaceAll("(?is)<script.*?>.*?</script>", "")
                .replaceAll("(?i)on\\w+\\s*=\\s*\"[^\"]*\"", "")
                .replaceAll("(?i)on\\w+\\s*=\\s*'[^']*'", "")
                .replaceAll("<(\\w+)\\s+>", "<$1>")
                .trim();
    }
}
