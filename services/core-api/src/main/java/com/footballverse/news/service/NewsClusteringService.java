package com.footballverse.news.service;

import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsContentKind;
import com.footballverse.news.model.RawItem;
import com.footballverse.news.repository.NewsArticleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NewsClusteringService {

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "before", "but", "by",
            "for", "from", "has", "have", "in", "into", "is", "latest", "live",
            "news", "of", "on", "or", "report", "reports", "said", "says", "soccer",
            "the", "to", "update", "updates", "was", "were", "will", "with"
    );

    private final NewsArticleRepository stories;
    private final NewsEmbeddingService embeddings;

    @Value("${app.ai.clustering-window-hours:24}")
    private long windowHours;

    @Value("${app.ai.clustering-candidate-limit:500}")
    private int candidateLimit;

    @Value("${app.ai.clustering-vector-threshold:0.82}")
    private double vectorThreshold;

    @Value("${app.ai.clustering-lexical-threshold:0.46}")
    private double lexicalThreshold;

    public ClusterDecision findCluster(RawItem rawItem) {
        Instant anchor = sourceTime(rawItem);
        Set<String> incomingTokens = tokens(rawItem.getTitle(), rawItem.getDescription());
        String incomingEvent = eventType(rawItem.getTitle(), rawItem.getDescription());
        Optional<NewsEmbeddingService.Embedding> incomingEmbedding = embeddings.embed(
                rawItem.getTitle(), rawItem.getDescription());

        Duration window = Duration.ofHours(Math.max(1, windowHours));
        return stories.findClusterCandidates(
                        NewsContentKind.AGGREGATED_STORY,
                        ArticleStatus.PUBLISHED,
                        anchor.minus(window),
                        anchor,
                        PageRequest.of(0, Math.max(20, candidateLimit))
                ).stream()
                .map(candidate -> match(candidate, incomingTokens, incomingEvent, incomingEmbedding))
                .filter(Objects::nonNull)
                .max(Comparator.comparingDouble(ClusterDecision::score))
                .orElse(null);
    }

    public Optional<NewsEmbeddingService.Embedding> createEmbedding(RawItem rawItem) {
        return embeddings.embed(rawItem.getTitle(), rawItem.getDescription());
    }

    private ClusterDecision match(
            NewsArticle candidate,
            Set<String> incomingTokens,
            String incomingEvent,
            Optional<NewsEmbeddingService.Embedding> incomingEmbedding
    ) {
        String candidateEvent = eventType(candidate.getTitle(), candidate.getSummary());
        if (!compatibleEvents(incomingEvent, candidateEvent)) {
            return null;
        }

        Set<String> candidateTokens = tokens(candidate.getTitle(), candidate.getSummary());
        double lexical = jaccard(incomingTokens, candidateTokens);
        int sharedTokens = sharedTokenCount(incomingTokens, candidateTokens);
        boolean entityGuard = sharedTokens >= 2 || lexical >= 0.30;
        if (!entityGuard) {
            return null;
        }

        Optional<double[]> candidateVector = embeddings.deserialize(candidate.getClusterEmbedding());
        if (incomingEmbedding.isPresent() && candidateVector.isPresent()) {
            double semantic = embeddings.cosineSimilarity(
                    incomingEmbedding.get().values(), candidateVector.get());
            double combined = semantic * 0.85 + lexical * 0.15;
            if (semantic >= vectorThreshold && combined >= vectorThreshold - 0.02) {
                return new ClusterDecision(candidate, clamp(combined), incomingEmbedding.get());
            }
            return null;
        }

        if (sharedTokens >= 3 && lexical >= lexicalThreshold) {
            return new ClusterDecision(candidate, clamp(lexical), incomingEmbedding.orElse(null));
        }
        return null;
    }

    private boolean compatibleEvents(String incoming, String candidate) {
        if (incoming.equals(candidate)) {
            return true;
        }
        if ("OTHER".equals(incoming) || "OTHER".equals(candidate)) {
            return false;
        }
        return ("RUMOUR".equals(incoming) && "TRANSFER".equals(candidate))
                || ("TRANSFER".equals(incoming) && "RUMOUR".equals(candidate));
    }

    private int sharedTokenCount(Set<String> left, Set<String> right) {
        Set<String> common = new HashSet<>(left);
        common.retainAll(right);
        return common.size();
    }

    private double jaccard(Set<String> left, Set<String> right) {
        if (left.isEmpty() || right.isEmpty()) {
            return 0.0;
        }
        Set<String> common = new HashSet<>(left);
        common.retainAll(right);
        Set<String> union = new HashSet<>(left);
        union.addAll(right);
        return union.isEmpty() ? 0.0 : (double) common.size() / union.size();
    }

    private Set<String> tokens(String... values) {
        String text = Arrays.stream(values)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.joining(" "));
        if (text.isBlank()) {
            return Set.of();
        }
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}]+", " ");
        Set<String> result = new HashSet<>();
        Arrays.stream(normalized.trim().split("\\s+"))
                .filter(token -> token.length() > 2 && !STOP_WORDS.contains(token))
                .map(this::stem)
                .forEach(result::add);
        return result;
    }

    public String eventType(String... values) {
        String text = String.join(" ", Arrays.stream(values).filter(Objects::nonNull).toList())
                .toLowerCase(Locale.ROOT);
        if (containsAny(text, "rumour", "rumor", "linked", "gossip", "claim", "claims", "interest in")) {
            return "RUMOUR";
        }
        if (containsAny(text, "sign", "signs", "signed", "signing", "transfer", "bid", "loan",
                "release clause", "medical", "bought", "free agent")) {
            return "TRANSFER";
        }
        if (containsAny(text, "injury", "injured", "fitness", "ruled out", "hamstring", "acl")) {
            return "INJURY";
        }
        if (containsAny(text, "beat", "draw", "wins", "won", "score", "scores", "match report",
                "highlight", "highlights")) {
            return "MATCH";
        }
        return "OTHER";
    }

    private boolean containsAny(String text, String... terms) {
        return Arrays.stream(terms).anyMatch(text::contains);
    }

    private String stem(String token) {
        String stem = token;
        if (stem.length() > 5 && stem.endsWith("ing")) {
            stem = stem.substring(0, stem.length() - 3);
        } else if (stem.length() > 4 && stem.endsWith("ed")) {
            stem = stem.substring(0, stem.length() - 2);
        } else if (stem.length() > 4 && stem.endsWith("s")) {
            stem = stem.substring(0, stem.length() - 1);
        }
        if (stem.length() > 4 && stem.endsWith("e")) {
            stem = stem.substring(0, stem.length() - 1);
        }
        return stem;
    }

    private Instant sourceTime(RawItem rawItem) {
        if (rawItem.getPublishedAt() != null) {
            return rawItem.getPublishedAt();
        }
        if (rawItem.getDiscoveredAt() != null) {
            return rawItem.getDiscoveredAt();
        }
        return Instant.now();
    }

    private double clamp(double score) {
        return Math.max(0.0, Math.min(1.0, score));
    }

    public record ClusterDecision(
            NewsArticle story,
            double score,
            NewsEmbeddingService.Embedding incomingEmbedding
    ) {
    }
}
