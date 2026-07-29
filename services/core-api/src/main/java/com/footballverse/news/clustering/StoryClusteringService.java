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

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StoryClusteringService {
    private static final Duration CLUSTER_WINDOW = Duration.ofHours(48);

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
            entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext('football-verse-news-clustering'))").getSingleResult();
        } catch (Exception e) {
            log.debug("Advisory lock acquisition skipped or non-PostgreSQL environment: {}", e.getMessage());
        }
    }

    public void updateStoryClusterProfile(Long storyId, String model, String modelRevision, int memberCount, float[] rawItemEmbedding) {
        if (storyId == null) return;
        StoryClusterProfile profile = profileRepository.findById(storyId)
                .orElseGet(() -> new StoryClusterProfile(
                        storyId,
                        rawItemEmbedding,
                        model != null ? model : "intfloat/multilingual-e5-small",
                        modelRevision != null ? modelRevision : "v1.0",
                        memberCount
                ));
        profile.setMemberCount(memberCount);
        if (rawItemEmbedding != null && rawItemEmbedding.length > 0) {
            if (profile.getCentroid() == null || profile.getCentroid().length == 0 || memberCount <= 1) {
                profile.setCentroid(rawItemEmbedding.clone());
            } else {
                float[] current = profile.getCentroid();
                float[] newCentroid = new float[current.length];
                for (int i = 0; i < current.length && i < rawItemEmbedding.length; i++) {
                    newCentroid[i] = (current[i] * (memberCount - 1) + rawItemEmbedding[i]) / memberCount;
                }
                profile.setCentroid(newCentroid);
            }
        }
        profile.setUpdatedAt(Instant.now());
        profileRepository.save(profile);
    }

    public void updateStoryClusterProfile(Long storyId, String model, String modelRevision, int memberCount) {
        updateStoryClusterProfile(storyId, model, modelRevision, memberCount, null);
    }

    @Transactional
    public ClusterResult decide(RawItem rawItem) {
        acquireAdvisoryLock();
        Instant anchor = rawItem.getPublishedAt() == null ? rawItem.getDiscoveredAt() : rawItem.getPublishedAt();
        if (anchor == null) anchor = Instant.now();

        EventFamily itemEvent = eventClassifier.classify(rawItem.getTitle(), rawItem.getDescription());
        EntityFingerprintExtractor.EntityFingerprint itemEntities = entityExtractor.extract(rawItem.getTitle(), rawItem.getDescription());

        // 1. Exact URL / Canonical URL check
        Optional<NewsArticle> exactMatch = stories.findBySourceUrl(rawItem.getOriginalUrl())
                .filter(candidate -> candidate.getContentKind() == NewsContentKind.AGGREGATED_STORY);
        if (exactMatch.isPresent()) {
            NewsArticle candidate = exactMatch.get();
            ClusterDecision decision = recordDecision(rawItem, candidate, "AUTO_MERGE", 1.0, 1.0, 1.0, 1.0, 1.0, "EXACT_CANONICAL_URL");
            return new ClusterResult(candidate, decision, true);
        }

        // 2. Candidate scan within configured window
        int windowHours = clusterConfig == null ? 48 : clusterConfig.getWindowHours();
        double threshold = clusterConfig == null ? 0.25 : clusterConfig.getAutoMergeThreshold();

        Instant windowStart = anchor.minus(Duration.ofHours(windowHours));
        Instant windowEnd = anchor.plus(Duration.ofHours(windowHours));

        java.util.Map<Long, Double> vectorScores = getVectorCandidateScores(rawItem, windowStart, windowEnd);

        List<NewsArticle> candidates;
        if (!vectorScores.isEmpty()) {
            candidates = stories.findAllById(vectorScores.keySet());
        } else {
            candidates = stories.findClusterCandidates(
                    NewsContentKind.AGGREGATED_STORY,
                    ArticleStatus.PUBLISHED,
                    windowStart,
                    windowEnd,
                    PageRequest.of(0, clusterConfig == null ? 200 : clusterConfig.getCandidateLimit())
            );
        }

        final Instant anchorTime = anchor;
        ClusterMatchBest bestMatch = candidates.stream()
                .map(candidate -> evaluateCandidate(rawItem, itemEvent, itemEntities, candidate, anchorTime, vectorScores.get(candidate.getId())))
                .filter(Objects::nonNull)
                .max(Comparator.comparingDouble(ClusterMatchBest::finalScore))
                .orElse(null);

        if (bestMatch != null && bestMatch.finalScore() >= threshold) {
            ClusterDecision decision = recordDecision(
                    rawItem,
                    bestMatch.story(),
                    "AUTO_MERGE",
                    bestMatch.semanticScore(),
                    bestMatch.lexicalScore(),
                    bestMatch.entityScore(),
                    bestMatch.timeScore(),
                    bestMatch.finalScore(),
                    bestMatch.reasonCode()
            );
            return new ClusterResult(bestMatch.story(), decision, true);
        }

        ClusterDecision decision = recordDecision(
                rawItem,
                null,
                "CREATE_NEW",
                0.0, 0.0, 0.0, 0.0, 0.0,
                "NO_CANDIDATE"
        );
        return new ClusterResult(null, decision, false);
    }

    private java.util.Map<Long, Double> getVectorCandidateScores(RawItem rawItem, Instant windowStart, Instant windowEnd) {
        if (rawItem.getEmbedding() == null || rawItem.getEmbedding().length == 0) {
            return java.util.Collections.emptyMap();
        }
        try {
            String vectorStr = new VectorConverter().convertToDatabaseColumn(rawItem.getEmbedding());
            if (vectorStr == null) return java.util.Collections.emptyMap();
            String model = rawItem.getEmbeddingModel() != null ? rawItem.getEmbeddingModel() : "intfloat/multilingual-e5-small";
            int limit = clusterConfig == null ? 20 : clusterConfig.getCandidateLimit();
            List<StoryClusterProfileRepository.CandidateVectorMatch> matches =
                    profileRepository.findVectorCandidates(vectorStr, windowStart, windowEnd, model, limit);
            java.util.Map<Long, Double> scoreMap = new java.util.HashMap<>();
            for (var m : matches) {
                if (m.getStoryId() != null && m.getSemanticScore() != null) {
                    scoreMap.put(m.getStoryId(), Math.max(0.0, Math.min(1.0, m.getSemanticScore())));
                }
            }
            return scoreMap;
        } catch (Exception e) {
            log.warn("pgvector candidate search failed, falling back to lexical-only scoring. " +
                    "If APP_CLUSTERING_MODE=vector, this means vector search is non-functional: {}", e.getMessage());
            return java.util.Collections.emptyMap();
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

        // Hard conflict check: INJURY vs TRANSFER, etc.
        if (isHardConflict(itemEvent, candidateEvent)) {
            return null;
        }

        EntityFingerprintExtractor.EntityFingerprint candidateEntities = entityExtractor.extract(candidate.getTitle(), candidate.getSummary());
        double entitySim = itemEntities.calculateSimilarity(candidateEntities);

        double lexicalSim = calculateLexicalJaccard(rawItem.getTitle(), candidate.getTitle());

        Instant candidateTime = candidate.getLastSourceAt() == null ? candidate.getCreatedAt() : candidate.getLastSourceAt();
        double timeScore = clusterScorer.calculateTimeDecay(anchor, candidateTime);
        double semanticScore = vectorSemanticScore != null ? vectorSemanticScore : lexicalSim;

        // Hard entity safety guard: If both articles have extracted entities but 0 similarity (different clubs/players) and semantic score is below 0.75, do NOT merge!
        if (itemEntities.hasEntities() && candidateEntities.hasEntities() && entitySim == 0.0 && semanticScore < 0.75) {
            return null;
        }

        double finalScore = clusterScorer.calculateHybridScore(semanticScore, lexicalSim, entitySim, anchor, candidateTime);

        String reasonCode = vectorSemanticScore != null
                ? (entitySim > 0.5 ? "VECTOR_ENTITY_SUPPORTED" : "VECTOR_HIGH_CONFIDENCE")
                : (entitySim > 0.5 ? "LEXICAL_ENTITY_SUPPORTED" : "LEXICAL_HIGH_CONFIDENCE");
        return new ClusterMatchBest(candidate, semanticScore, lexicalSim, entitySim, timeScore, finalScore, reasonCode);
    }

    private boolean isHardConflict(EventFamily e1, EventFamily e2) {
        if (e1 == EventFamily.INJURY && (e2 == EventFamily.TRANSFER_OFFICIAL || e2 == EventFamily.TRANSFER_RUMOUR || e2 == EventFamily.TRANSFER_AGREEMENT)) {
            return true;
        }
        if (e2 == EventFamily.INJURY && (e1 == EventFamily.TRANSFER_OFFICIAL || e1 == EventFamily.TRANSFER_RUMOUR || e1 == EventFamily.TRANSFER_AGREEMENT)) {
            return true;
        }
        return false;
    }

    private double calculateLexicalJaccard(String title1, String title2) {
        if (title1 == null || title2 == null) return 0.0;
        String[] words1 = title1.toLowerCase().split("\\s+");
        String[] words2 = title2.toLowerCase().split("\\s+");
        var s1 = new java.util.HashSet<>(java.util.Arrays.asList(words1));
        var s2 = new java.util.HashSet<>(java.util.Arrays.asList(words2));
        var inter = new java.util.HashSet<>(s1);
        inter.retainAll(s2);
        var union = new java.util.HashSet<>(s1);
        union.addAll(s2);
        return union.isEmpty() ? 0.0 : (double) inter.size() / union.size();
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
        ClusterDecision d = new ClusterDecision();
        d.setRawItemId(rawItem.getId());
        d.setSelectedStoryId(selectedStory == null ? null : selectedStory.getId());
        d.setAction(action);
        d.setSemanticScore(clusterScorer.toBigDecimal(semantic));
        d.setLexicalScore(clusterScorer.toBigDecimal(lexical));
        d.setEntityScore(clusterScorer.toBigDecimal(entity));
        d.setTimeScore(clusterScorer.toBigDecimal(time));
        d.setFinalScore(clusterScorer.toBigDecimal(finalScore));
        d.setReasonCode(reasonCode);
        return decisionRepository.save(d);
    }

    public record ClusterResult(NewsArticle story, ClusterDecision decision, boolean matched) {
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
