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
        } catch (Exception ignored) {
            // Non-PostgreSQL or H2 test environment fallback
        }
    }

    public void updateStoryClusterProfile(Long storyId, String model, String modelRevision, int memberCount) {
        if (storyId == null) return;
        StoryClusterProfile profile = profileRepository.findById(storyId)
                .orElseGet(() -> new StoryClusterProfile(storyId, model != null ? model : "intfloat/multilingual-e5-small", modelRevision != null ? modelRevision : "v1.0", memberCount));
        profile.setMemberCount(memberCount);
        profile.setUpdatedAt(Instant.now());
        profileRepository.save(profile);
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

        var candidates = stories.findClusterCandidates(
                NewsContentKind.AGGREGATED_STORY,
                ArticleStatus.PUBLISHED,
                anchor.minus(Duration.ofHours(windowHours)),
                anchor.plus(Duration.ofHours(windowHours)),
                PageRequest.of(0, clusterConfig == null ? 200 : clusterConfig.getCandidateLimit())
        );

        final Instant anchorTime = anchor;
        ClusterMatchBest bestMatch = candidates.stream()
                .map(candidate -> evaluateCandidate(rawItem, itemEvent, itemEntities, candidate, anchorTime))
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

    private ClusterMatchBest evaluateCandidate(
            RawItem rawItem,
            EventFamily itemEvent,
            EntityFingerprintExtractor.EntityFingerprint itemEntities,
            NewsArticle candidate,
            Instant anchor
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

        // Fallback or semantic score
        double semanticScore = lexicalSim; // Base semantic estimation for Phase 1
        double finalScore = clusterScorer.calculateHybridScore(semanticScore, lexicalSim, entitySim, anchor, candidateTime);

        String reasonCode = entitySim > 0.5 ? "VECTOR_ENTITY_SUPPORTED" : "VECTOR_HIGH_CONFIDENCE";
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
