package com.footballverse.news.clustering;

import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsContentKind;
import com.footballverse.news.model.RawItem;
import com.footballverse.news.repository.NewsArticleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class StoryClusteringService {
    private static final int EMBEDDING_DIMENSIONS = 384;
    private static final Set<String> LEXICAL_STOP_WORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have",
            "in", "is", "it", "latest", "live", "news", "of", "on", "or", "report", "reports",
            "said", "says", "the", "to", "update", "updates", "was", "were", "will", "with"
    );

    private final NewsArticleRepository stories;
    private final ClusterDecisionRepository decisionRepository;
    private final StoryClusterProfileRepository profileRepository;
    private final RuleBasedEventClassifier eventClassifier;
    private final EntityFingerprintExtractor entityExtractor;
    private final ClusterScorer clusterScorer;
    private final ClusterConfiguration clusterConfig;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    public void acquireAdvisoryLock() {
        try {
            entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext('football-verse-news-clustering'))")
                    .getSingleResult();
        } catch (Exception e) {
            log.debug("Advisory lock acquisition skipped or non-PostgreSQL environment: {}", e.getMessage());
        }
    }

    public void updateStoryClusterProfile(
            Long storyId,
            String model,
            String modelRevision,
            int memberCount,
            float[] rawItemEmbedding
    ) {
        if (storyId == null || !isValidEmbedding(rawItemEmbedding) || model == null || modelRevision == null) {
            return;
        }

        float[] normalizedIncoming = normalizeVector(rawItemEmbedding);
        StoryClusterProfile profile = profileRepository.findById(storyId).orElse(null);
        if (profile == null) {
            profileRepository.save(new StoryClusterProfile(storyId, normalizedIncoming, model, modelRevision, 1));
            return;
        }

        if (!model.equals(profile.getModel()) || !modelRevision.equals(profile.getModelRevision())) {
            log.warn("Skipping centroid update for story {} because embedding revision changed from {}/{} to {}/{}",
                    storyId, profile.getModel(), profile.getModelRevision(), model, modelRevision);
            return;
        }

        int oldCount = Math.max(1, profile.getMemberCount());
        int newCount = Math.max(oldCount + 1, memberCount);
        float[] current = profile.getCentroid();
        if (!isValidEmbedding(current)) {
            profile.setCentroid(normalizedIncoming);
            profile.setMemberCount(1);
        } else {
            float[] newCentroid = new float[EMBEDDING_DIMENSIONS];
            for (int i = 0; i < EMBEDDING_DIMENSIONS; i++) {
                newCentroid[i] = ((current[i] * oldCount) + normalizedIncoming[i]) / (oldCount + 1);
            }
            profile.setCentroid(normalizeVector(newCentroid));
            profile.setMemberCount(newCount);
        }
        profile.setUpdatedAt(Instant.now());
        profileRepository.save(profile);
    }

    public void updateStoryClusterProfile(Long storyId, String model, String modelRevision, int memberCount) {
        // A count-only update must not fabricate or mutate a semantic centroid.
    }

    @Transactional
    public ClusterResult decide(RawItem rawItem) {
        acquireAdvisoryLock();
        Instant anchor = rawItem.getPublishedAt() == null ? rawItem.getDiscoveredAt() : rawItem.getPublishedAt();
        if (anchor == null) anchor = Instant.now();

        EventFamily itemEvent = eventClassifier.classify(rawItem.getTitle(), rawItem.getDescription());
        EntityFingerprintExtractor.EntityFingerprint itemEntities =
                entityExtractor.extract(rawItem.getTitle(), rawItem.getDescription());

        Optional<NewsArticle> exactMatch = stories.findBySourceUrl(rawItem.getOriginalUrl())
                .filter(candidate -> candidate.getContentKind() == NewsContentKind.AGGREGATED_STORY);
        if (exactMatch.isPresent()) {
            NewsArticle candidate = exactMatch.get();
            ClusterDecision decision = recordDecision(
                    rawItem, candidate, "AUTO_MERGE", 1.0, 1.0, 1.0, 1.0, 1.0, "EXACT_CANONICAL_URL"
            );
            return new ClusterResult(candidate, decision, true);
        }

        int windowHours = clusterConfig == null ? 36 : clusterConfig.getWindowHours();
        double autoMergeThreshold = clusterConfig == null ? 0.78 : clusterConfig.getAutoMergeThreshold();
        double reviewThreshold = clusterConfig == null ? 0.68 : clusterConfig.getReviewThreshold();
        Instant windowStart = anchor.minus(Duration.ofHours(windowHours));
        Instant windowEnd = anchor.plus(Duration.ofHours(windowHours));

        VectorCandidates vectorCandidates = getVectorCandidateScores(rawItem, windowStart, windowEnd);
        List<NewsArticle> candidates;
        if (!vectorCandidates.scores().isEmpty()) {
            candidates = stories.findAllById(vectorCandidates.scores().keySet());
        } else {
            candidates = stories.findClusterCandidates(
                    NewsContentKind.AGGREGATED_STORY,
                    ArticleStatus.PUBLISHED,
                    windowStart,
                    windowEnd,
                    PageRequest.of(0, clusterConfig == null ? 40 : clusterConfig.getCandidateLimit())
            );
        }

        final Instant anchorTime = anchor;
        ClusterMatchBest bestMatch = candidates.stream()
                .map(candidate -> evaluateCandidate(
                        rawItem,
                        itemEvent,
                        itemEntities,
                        candidate,
                        anchorTime,
                        vectorCandidates.scores().get(candidate.getId())
                ))
                .filter(Objects::nonNull)
                .max(Comparator.comparingDouble(ClusterMatchBest::finalScore))
                .orElse(null);

        if (bestMatch != null && bestMatch.finalScore() >= autoMergeThreshold) {
            ClusterDecision decision = recordDecision(
                    rawItem, bestMatch.story(), "AUTO_MERGE",
                    bestMatch.semanticScore(), bestMatch.lexicalScore(), bestMatch.entityScore(),
                    bestMatch.timeScore(), bestMatch.finalScore(), bestMatch.reasonCode()
            );
            return new ClusterResult(bestMatch.story(), decision, true);
        }

        if (bestMatch != null && bestMatch.finalScore() >= reviewThreshold) {
            ClusterDecision decision = recordDecision(
                    rawItem, bestMatch.story(), "REVIEW_REQUIRED",
                    bestMatch.semanticScore(), bestMatch.lexicalScore(), bestMatch.entityScore(),
                    bestMatch.timeScore(), bestMatch.finalScore(), "AMBIGUOUS_CANDIDATE"
            );
            // Conservative behavior: never auto-merge an ambiguous item.
            return new ClusterResult(null, decision, false);
        }

        ClusterDecision decision = recordDecision(
                rawItem, null, "CREATE_NEW", 0.0, 0.0, 0.0, 0.0, 0.0,
                vectorCandidates.failed() ? "VECTOR_SEARCH_FAILED" : "NO_CANDIDATE"
        );
        return new ClusterResult(null, decision, false);
    }

    private VectorCandidates getVectorCandidateScores(RawItem rawItem, Instant windowStart, Instant windowEnd) {
        if (!isValidEmbedding(rawItem.getEmbedding())) {
            return new VectorCandidates(Map.of(), false);
        }
        if (rawItem.getEmbeddingModel() == null || rawItem.getEmbeddingRevision() == null) {
            return new VectorCandidates(Map.of(), false);
        }

        try {
            String vectorStr = new VectorConverter().convertToDatabaseColumn(normalizeVector(rawItem.getEmbedding()));
            if (vectorStr == null) return new VectorCandidates(Map.of(), false);
            int limit = clusterConfig == null ? 40 : clusterConfig.getCandidateLimit();
            List<StoryClusterProfileRepository.CandidateVectorMatch> matches = profileRepository.findVectorCandidates(
                    vectorStr,
                    windowStart,
                    windowEnd,
                    rawItem.getEmbeddingModel(),
                    rawItem.getEmbeddingRevision(),
                    limit
            );
            Map<Long, Double> scores = new HashMap<>();
            for (var match : matches) {
                if (match.getStoryId() != null && match.getSemanticScore() != null) {
                    scores.put(match.getStoryId(), clamp(match.getSemanticScore()));
                }
            }
            return new VectorCandidates(Map.copyOf(scores), false);
        } catch (Exception e) {
            boolean vectorMode = clusterConfig != null && "vector".equalsIgnoreCase(clusterConfig.getMode());
            boolean failClosed = clusterConfig == null || clusterConfig.isFailClosedOnVectorError();
            if (vectorMode && failClosed) {
                throw new IllegalStateException("Vector candidate retrieval failed in vector mode", e);
            }
            log.warn("pgvector candidate search failed; vector decision disabled for this item: {}", e.getMessage());
            return new VectorCandidates(Map.of(), true);
        }
    }

    private ClusterMatchBest evaluateCandidate(
            RawItem rawItem,
            EventFamily itemEvent,
            EntityFingerprintExtractor.EntityFingerprint itemEntities,
            NewsArticle candidate,
            Instant anchor,
            Double vectorSemanticScore
    ) {
        EventFamily candidateEvent = eventClassifier.classify(candidate.getTitle(), candidate.getSummary());
        if (isHardConflict(itemEvent, candidateEvent)) return null;

        EntityFingerprintExtractor.EntityFingerprint candidateEntities =
                entityExtractor.extract(candidate.getTitle(), candidate.getSummary());
        double entityScore = itemEntities.calculateSimilarity(candidateEntities);
        double lexicalScore = calculateLexicalJaccard(rawItem.getTitle(), candidate.getTitle());
        double semanticScore = vectorSemanticScore == null ? lexicalScore : vectorSemanticScore;
        double minimumSemantic = clusterConfig == null ? 0.72 : clusterConfig.getMinimumSemanticScore();
        double minimumEntity = clusterConfig == null ? 0.15 : clusterConfig.getMinimumEntityScore();

        if (vectorSemanticScore != null && semanticScore < minimumSemantic) return null;
        if (itemEntities.hasConflictingPeople(candidateEntities) && semanticScore < 0.90) return null;
        if (itemEntities.hasEntities() && candidateEntities.hasEntities()
                && !itemEntities.sharesAnyEntity(candidateEntities) && semanticScore < 0.88) return null;
        if (vectorSemanticScore != null && entityScore < minimumEntity && lexicalScore < 0.35 && semanticScore < 0.86) {
            return null;
        }

        Instant candidateTime = candidate.getLastSourceAt() == null ? candidate.getCreatedAt() : candidate.getLastSourceAt();
        double timeScore = clusterScorer.calculateTimeDecay(anchor, candidateTime);
        double finalScore = clusterScorer.calculateHybridScore(
                semanticScore, lexicalScore, entityScore, anchor, candidateTime
        );

        String reasonCode = vectorSemanticScore != null
                ? (entityScore >= minimumEntity ? "VECTOR_ENTITY_SUPPORTED" : "VECTOR_HIGH_CONFIDENCE")
                : (entityScore >= minimumEntity ? "LEXICAL_ENTITY_SUPPORTED" : "LEXICAL_ONLY");
        return new ClusterMatchBest(
                candidate, semanticScore, lexicalScore, entityScore, timeScore, finalScore, reasonCode
        );
    }

    private boolean isHardConflict(EventFamily first, EventFamily second) {
        if (first == second || first == EventFamily.GENERAL || second == EventFamily.GENERAL
                || first == EventFamily.UNKNOWN || second == EventFamily.UNKNOWN) {
            return false;
        }
        if (isTransfer(first) && isTransfer(second)) {
            return transferStage(first) != transferStage(second);
        }
        if (isMatch(first) && isMatch(second)) return true;
        if ((first == EventFamily.MANAGER_APPOINTMENT && second == EventFamily.MANAGER_SACKING)
                || (first == EventFamily.MANAGER_SACKING && second == EventFamily.MANAGER_APPOINTMENT)) {
            return true;
        }
        return category(first) != category(second);
    }

    private boolean isTransfer(EventFamily event) {
        return event.name().startsWith("TRANSFER_");
    }

    private boolean isMatch(EventFamily event) {
        return event == EventFamily.MATCH_PREVIEW || event == EventFamily.LINEUP || event == EventFamily.MATCH_RESULT;
    }

    private int transferStage(EventFamily event) {
        return switch (event) {
            case TRANSFER_RUMOUR, TRANSFER_INTEREST -> 1;
            case TRANSFER_BID -> 2;
            case TRANSFER_AGREEMENT -> 3;
            case TRANSFER_OFFICIAL -> 4;
            default -> 0;
        };
    }

    private String category(EventFamily event) {
        if (isTransfer(event)) return "TRANSFER";
        if (event == EventFamily.INJURY || event == EventFamily.INJURY_UPDATE) return "INJURY";
        if (isMatch(event)) return "MATCH";
        if (event == EventFamily.MANAGER_APPOINTMENT || event == EventFamily.MANAGER_SACKING) return "MANAGER";
        if (event == EventFamily.CONTRACT_RENEWAL) return "CONTRACT";
        return event.name();
    }

    private double calculateLexicalJaccard(String first, String second) {
        Set<String> firstTokens = lexicalTokens(first);
        Set<String> secondTokens = lexicalTokens(second);
        if (firstTokens.isEmpty() || secondTokens.isEmpty()) return 0.0;
        Set<String> intersection = new HashSet<>(firstTokens);
        intersection.retainAll(secondTokens);
        Set<String> union = new HashSet<>(firstTokens);
        union.addAll(secondTokens);
        return (double) intersection.size() / union.size();
    }

    private Set<String> lexicalTokens(String value) {
        if (value == null || value.isBlank()) return Set.of();
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}]+", " ");
        Set<String> result = new HashSet<>();
        Arrays.stream(normalized.trim().split("\\s+"))
                .filter(token -> token.length() > 2 && !LEXICAL_STOP_WORDS.contains(token))
                .forEach(result::add);
        return result;
    }

    private boolean isValidEmbedding(float[] vector) {
        if (vector == null || vector.length != EMBEDDING_DIMENSIONS) return false;
        for (float value : vector) {
            if (!Float.isFinite(value)) return false;
        }
        return true;
    }

    private float[] normalizeVector(float[] vector) {
        double normSquared = 0.0;
        for (float value : vector) normSquared += value * value;
        double norm = Math.sqrt(normSquared);
        if (norm == 0.0 || !Double.isFinite(norm)) {
            throw new IllegalArgumentException("Embedding vector must have a finite non-zero norm");
        }
        float[] normalized = new float[vector.length];
        for (int i = 0; i < vector.length; i++) normalized[i] = (float) (vector[i] / norm);
        return normalized;
    }

    private double clamp(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private ClusterDecision recordDecision(
            RawItem rawItem,
            NewsArticle selectedStory,
            String action,
            double semantic,
            double lexical,
            double entity,
            double time,
            double finalScore,
            String reasonCode
    ) {
        ClusterDecision decision = new ClusterDecision();
        decision.setRawItemId(rawItem.getId());
        decision.setSelectedStoryId(selectedStory == null ? null : selectedStory.getId());
        decision.setAction(action);
        decision.setModel(rawItem.getEmbeddingModel());
        decision.setModelRevision(rawItem.getEmbeddingRevision());
        decision.setSemanticScore(clusterScorer.toBigDecimal(semantic));
        decision.setLexicalScore(clusterScorer.toBigDecimal(lexical));
        decision.setEntityScore(clusterScorer.toBigDecimal(entity));
        decision.setTimeScore(clusterScorer.toBigDecimal(time));
        decision.setFinalScore(clusterScorer.toBigDecimal(finalScore));
        decision.setReasonCode(reasonCode);
        return decisionRepository.save(decision);
    }

    public record ClusterResult(NewsArticle story, ClusterDecision decision, boolean matched) {
    }

    private record VectorCandidates(Map<Long, Double> scores, boolean failed) {
    }

    private record ClusterMatchBest(
            NewsArticle story,
            double semanticScore,
            double lexicalScore,
            double entityScore,
            double timeScore,
            double finalScore,
            String reasonCode
    ) {
    }
}
