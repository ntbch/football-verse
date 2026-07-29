package com.footballverse.news.clustering;

import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class EntityFingerprintExtractor {
    private static final Set<String> CLUBS = Set.of(
            "manchester united", "man utd", "man city", "manchester city", "liverpool",
            "chelsea", "arsenal", "tottenham", "spurs", "real madrid", "barcelona",
            "bayern munich", "psg", "paris saint-germain", "juventus", "inter milan",
            "ac milan", "benfica", "sporting", "porto", "dortmund", "bayer leverkusen"
    );

    private static final Pattern PROPER_NOUNS = Pattern.compile("\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\b");

    public EntityFingerprint extract(String title, String summary) {
        String text = (title == null ? "" : title) + " " + (summary == null ? "" : summary);
        String lowerText = text.toLowerCase(Locale.ROOT);

        Set<String> matchedClubs = new HashSet<>();
        for (String club : CLUBS) {
            if (lowerText.contains(club)) {
                matchedClubs.add(club);
            }
        }

        Set<String> properNouns = new HashSet<>();
        Matcher matcher = PROPER_NOUNS.matcher(text);
        while (matcher.find()) {
            String noun = matcher.group();
            if (noun.length() > 3 && !CLUBS.contains(noun.toLowerCase(Locale.ROOT))) {
                properNouns.add(noun.toLowerCase(Locale.ROOT));
            }
        }

        return new EntityFingerprint(matchedClubs, properNouns);
    }

    public record EntityFingerprint(Set<String> clubs, Set<String> properNouns) {
        public double calculateSimilarity(EntityFingerprint other) {
            if (other == null) return 0.0;
            double clubSim = jaccard(this.clubs, other.clubs);
            double nounSim = jaccard(this.properNouns, other.properNouns);
            return (clubSim * 0.6) + (nounSim * 0.4);
        }

        private double jaccard(Set<String> a, Set<String> b) {
            if (a.isEmpty() && b.isEmpty()) return 1.0;
            if (a.isEmpty() || b.isEmpty()) return 0.0;
            Set<String> intersection = new HashSet<>(a);
            intersection.retainAll(b);
            Set<String> union = new HashSet<>(a);
            union.addAll(b);
            return (double) intersection.size() / union.size();
        }
    }
}
