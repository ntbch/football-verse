package com.footballverse.news.clustering;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class EntityFingerprintExtractor {
    private static final Map<String, String> CLUB_ALIASES = clubAliases();
    private static final Set<String> GENERIC_ENTITIES = Set.of(
            "breaking", "exclusive", "report", "reports", "sources", "football",
            "premier league", "champions league", "europa league", "conference league",
            "world cup", "club world cup", "transfer news", "match report", "latest news"
    );
    private static final Pattern PROPER_NOUNS = Pattern.compile(
            "\\b\\p{Lu}[\\p{L}\\p{M}'’.-]+(?:\\s+\\p{Lu}[\\p{L}\\p{M}'’.-]+){0,3}\\b"
    );

    public EntityFingerprint extract(String title, String summary) {
        String text = (title == null ? "" : title) + " " + (summary == null ? "" : summary);
        String normalizedText = normalize(text);

        Set<String> matchedClubs = new HashSet<>();
        CLUB_ALIASES.forEach((alias, canonical) -> {
            if (containsPhrase(normalizedText, alias)) {
                matchedClubs.add(canonical);
            }
        });

        Set<String> properNouns = new HashSet<>();
        Matcher matcher = PROPER_NOUNS.matcher(text);
        while (matcher.find()) {
            String noun = normalize(matcher.group());
            if (noun.length() <= 3
                    || GENERIC_ENTITIES.contains(noun)
                    || CLUB_ALIASES.containsKey(noun)
                    || matchedClubs.contains(noun)) {
                continue;
            }
            properNouns.add(noun);
        }

        return new EntityFingerprint(Set.copyOf(matchedClubs), Set.copyOf(properNouns));
    }

    private static boolean containsPhrase(String text, String phrase) {
        return (" " + text + " ").contains(" " + phrase + " ");
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}'’.-]+", " ")
                .trim()
                .replaceAll("\\s+", " ");
    }

    private static Map<String, String> clubAliases() {
        Map<String, String> aliases = new HashMap<>();
        addAliases(aliases, "manchester united", "manchester united", "man utd", "man united", "red devils");
        addAliases(aliases, "manchester city", "manchester city", "man city", "cityzens");
        addAliases(aliases, "liverpool", "liverpool", "liverpool fc", "reds");
        addAliases(aliases, "chelsea", "chelsea", "chelsea fc", "blues");
        addAliases(aliases, "arsenal", "arsenal", "arsenal fc", "gunners");
        addAliases(aliases, "tottenham hotspur", "tottenham", "tottenham hotspur", "spurs");
        addAliases(aliases, "newcastle united", "newcastle", "newcastle united", "magpies");
        addAliases(aliases, "aston villa", "aston villa", "villa");
        addAliases(aliases, "real madrid", "real madrid", "real madrid cf", "los blancos");
        addAliases(aliases, "barcelona", "barcelona", "fc barcelona", "barca", "barça");
        addAliases(aliases, "atletico madrid", "atletico madrid", "atlético madrid", "atleti");
        addAliases(aliases, "bayern munich", "bayern munich", "bayern münchen", "fc bayern");
        addAliases(aliases, "borussia dortmund", "borussia dortmund", "dortmund", "bvb");
        addAliases(aliases, "bayer leverkusen", "bayer leverkusen", "leverkusen");
        addAliases(aliases, "paris saint-germain", "paris saint-germain", "paris saint germain", "psg");
        addAliases(aliases, "juventus", "juventus", "juve");
        addAliases(aliases, "inter milan", "inter milan", "internazionale", "inter");
        addAliases(aliases, "ac milan", "ac milan", "milan");
        addAliases(aliases, "napoli", "napoli", "ssc napoli");
        addAliases(aliases, "benfica", "benfica", "sl benfica");
        addAliases(aliases, "sporting cp", "sporting", "sporting cp", "sporting lisbon");
        addAliases(aliases, "porto", "porto", "fc porto");
        return Map.copyOf(aliases);
    }

    private static void addAliases(Map<String, String> aliases, String canonical, String... values) {
        for (String value : values) {
            aliases.put(normalize(value), canonical);
        }
    }

    public record EntityFingerprint(Set<String> clubs, Set<String> properNouns) {
        public boolean hasEntities() {
            return !clubs.isEmpty() || !properNouns.isEmpty();
        }

        public boolean hasConflictingPeople(EntityFingerprint other) {
            return other != null
                    && !properNouns.isEmpty()
                    && !other.properNouns.isEmpty()
                    && intersectionSize(properNouns, other.properNouns) == 0;
        }

        public boolean sharesAnyEntity(EntityFingerprint other) {
            return other != null
                    && (intersectionSize(clubs, other.clubs) > 0
                    || intersectionSize(properNouns, other.properNouns) > 0);
        }

        public double calculateSimilarity(EntityFingerprint other) {
            if (other == null) return 0.0;
            double clubSim = jaccard(this.clubs, other.clubs);
            double nounSim = jaccard(this.properNouns, other.properNouns);

            boolean clubsAvailable = !clubs.isEmpty() && !other.clubs.isEmpty();
            boolean peopleAvailable = !properNouns.isEmpty() && !other.properNouns.isEmpty();
            if (clubsAvailable && peopleAvailable) {
                return (clubSim * 0.55) + (nounSim * 0.45);
            }
            if (peopleAvailable) return nounSim;
            if (clubsAvailable) return clubSim;
            return 0.0;
        }

        private static int intersectionSize(Set<String> a, Set<String> b) {
            Set<String> intersection = new HashSet<>(a);
            intersection.retainAll(b);
            return intersection.size();
        }

        private static double jaccard(Set<String> a, Set<String> b) {
            if (a.isEmpty() || b.isEmpty()) return 0.0;
            Set<String> intersection = new HashSet<>(a);
            intersection.retainAll(b);
            Set<String> union = new HashSet<>(a);
            union.addAll(b);
            return (double) intersection.size() / union.size();
        }
    }
}
