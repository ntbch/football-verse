package com.footballverse.news.service;

import java.util.Arrays;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Cleans article summaries by stripping source-name suffixes and boilerplate lines.
 * Ported from frontend cleanSummaryText to ensure every consumer gets clean text.
 */
public final class SummarySanitizer {

    private static final Pattern SOURCE_SUFFIX = Pattern.compile(
            "(?:\\s+|-|\\|)*(?:BBC|Sky Sports|Reuters|GNews|ESPN|Goal|The Guardian)$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern BOILERPLATE_LINE = Pattern.compile(
            "^(?:Subscribe|Watch|Follow|Click|http://|https://|MNF|FNF|SNF|Super Sunday|Saturday Social|Gary Neville)",
            Pattern.CASE_INSENSITIVE
    );

    private SummarySanitizer() {}

    public static String clean(String text) {
        if (text == null || text.isEmpty()) return "";
        String stripped = SOURCE_SUFFIX.matcher(text).replaceAll("").trim();
        String[] parts = stripped.split("(?:\u25ba|\n)+");
        String result = Arrays.stream(parts)
                .map(String::trim)
                .filter(line -> !line.isEmpty() && !BOILERPLATE_LINE.matcher(line).find())
                .collect(Collectors.joining("\n\n"));
        return result.isEmpty() ? stripped : result;
    }
}