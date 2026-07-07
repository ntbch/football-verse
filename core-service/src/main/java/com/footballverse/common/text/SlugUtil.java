package com.footballverse.common.text;

import java.text.Normalizer;
import java.util.Locale;

/** ponytail: slug()/uniqueSlug() was copy-pasted in CrawlService and NewsService. Deduped here. */
public final class SlugUtil {

    private SlugUtil() {}

    public static String slug(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }

    public static String uniqueSlug(String value) {
        return slug(value) + "-" + System.currentTimeMillis();
    }
}
