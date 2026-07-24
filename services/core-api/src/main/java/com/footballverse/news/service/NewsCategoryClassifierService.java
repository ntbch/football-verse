package com.footballverse.news.service;

import com.footballverse.news.model.NewsCategory;
import com.footballverse.news.repository.NewsCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class NewsCategoryClassifierService {

    private final NewsCategoryRepository categoryRepository;

    public NewsCategory classify(String title, String content, String aiCategoryHint) {
        if (aiCategoryHint != null && !aiCategoryHint.isBlank()) {
            String slug = mapCategoryNameToSlug(aiCategoryHint);
            var match = categoryRepository.findBySlug(slug);
            if (match.isPresent()) return match.get();
        }

        String text = ((title == null ? "" : title) + " " + (content == null ? "" : content)).toLowerCase(Locale.ROOT);
        String slug = classifySlugByRules(text);
        return categoryRepository.findBySlug(slug)
                .orElseGet(() -> categoryRepository.findBySlug("league-tournament-news").orElse(null));
    }

    public String mapCategoryNameToSlug(String categoryName) {
        String name = categoryName.trim().toLowerCase(Locale.ROOT);
        if (name.contains("transfer")) return "transfer-news";
        if (name.contains("match")) return "match-preview-analysis";
        if (name.contains("opinion")) return "expert-fan-opinions";
        if (name.contains("fact") || name.contains("tactic")) return "football-facts-tactical-insights";
        if (name.contains("pitch") || name.contains("off")) return "off-the-pitch";
        return "league-tournament-news";
    }

    public String classifySlugByRules(String text) {
        // 1. Opinions (behavior, statements, controversies, quotes, pundit reactions)
        if (containsAny(text, "behaviour", "behavior", "intolerable", "unacceptable", "criticis", "criticiz",
                "slams", "blasts", "controversy", "disgrace", "disrespect", "rant", "outrage", "pundit", "var decision")) {
            return "expert-fan-opinions";
        }

        // 2. Transfers (strictly transfer/signing related)
        if (containsAny(text, "transfer", "transfers", "signing", "signed", "signs", "loan deal", "release clause",
                "free agent", "fee agreed", "agree fee", "buy player", "bought for", "here we go", "medical scheduled", "contract extension")) {
            return "transfer-news";
        }

        // 3. Match Analysis (previews, reports, lineups, scores, vs)
        if (containsAny(text, "vs ", " vs ", "beat ", "defeated", "highlight", "match report", "lineup", "starting xi", "predicted xi", "scoreline", "full-time")) {
            return "match-preview-analysis";
        }

        // 4. Tactical / Facts
        if (containsAny(text, "tactic", "tactical", "xg ", "expected goals", "heatmap", "pressing system", "formation", "all-time record", "stats breakdown")) {
            return "football-facts-tactical-insights";
        }

        // 5. Off the Pitch
        if (containsAny(text, "lifestyle", "fashion", "supercar", "court case", "arrested", "scandal", "holiday", "vacation")) {
            return "off-the-pitch";
        }

        // 6. Default
        return "league-tournament-news";
    }

    private boolean containsAny(String text, String... terms) {
        for (String term : terms) {
            if (text.contains(term)) return true;
        }
        return false;
    }
}
