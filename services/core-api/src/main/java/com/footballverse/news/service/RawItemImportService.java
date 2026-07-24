package com.footballverse.news.service;

import com.footballverse.common.text.SlugUtil;
import com.footballverse.news.dto.ArticleImportResponse;
import com.footballverse.news.dto.NormalizedItemImportRequest;
import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsContentKind;
import com.footballverse.news.model.NewsSource;
import com.footballverse.news.model.RawItem;
import com.footballverse.news.model.StoryItem;
import com.footballverse.news.model.StoryKeyPoint;
import com.footballverse.news.model.KeyPointEvidence;
import com.footballverse.news.model.VerificationStatus;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.news.repository.NewsSourceRepository;
import com.footballverse.news.repository.RawItemRepository;
import com.footballverse.news.repository.StoryItemRepository;
import com.footballverse.news.repository.StoryKeyPointRepository;
import com.footballverse.news.repository.KeyPointEvidenceRepository;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.HashSet;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.net.URI;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class RawItemImportService {
    private static final Duration CLUSTER_WINDOW = Duration.ofHours(48);
    private static final Pattern TRANSFER_FEE = Pattern.compile("(?:€|£|\\$)\\s*\\d+(?:[.,]\\d+)?\\s*(?:m|million|bn|billion)?", Pattern.CASE_INSENSITIVE);
    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "before", "but", "by",
            "for", "from", "has", "have", "in", "into", "is", "latest", "live",
            "news", "of", "on", "or", "report", "reports", "said", "says", "soccer",
            "the", "to", "update", "updates", "was", "were", "will", "with"
    );

    private final RawItemRepository rawItems;
    private final StoryItemRepository storyItems;
    private final NewsArticleRepository stories;
    private final NewsSourceRepository sources;
    private final StoryKeyPointRepository keyPoints;
    private final KeyPointEvidenceRepository evidence;

    @Transactional
    public ArticleImportResponse importItem(NormalizedItemImportRequest request) {
        validateContract(request);
        NewsSource source = sources.findById(request.connectorId())
                .orElseThrow(() -> new IllegalArgumentException("Connector not found"));
        if (!source.isActive()) {
            return new ArticleImportResponse("REJECTED", "Connector is disabled");
        }
        if (!source.getProvider().equalsIgnoreCase(request.provider())) {
            throw new IllegalArgumentException("Provider does not match connector");
        }

        var existing = rawItems.findByIdentityKey(request.identityKey());
        if (existing.isPresent()) {
            RawItem rawItem = existing.get();
            if (rawItem.getRevisionFingerprint().equals(request.revisionFingerprint())) {
                return new ArticleImportResponse("EXISTS", "Raw item revision already exists");
            }
            apply(rawItem, source, request);
            rawItem.setStatus(source.isAutoPublish() ? "ACTIVE" : "REVIEW");
            rawItems.save(rawItem);
            if (!source.isAutoPublish()) {
                return new ArticleImportResponse("UPDATED", "Raw item retained for review");
            }
            var existingMembership = storyItems.findFirstByRawItem(rawItem);
            if (existingMembership.isPresent()) {
                updateStory(existingMembership.get().getStory(), rawItem);
                return new ArticleImportResponse("UPDATED", "Raw item revision updated");
            }
            return projectRawItem(source, rawItem);
        }

        RawItem rawItem = new RawItem();
        apply(rawItem, source, request);
        rawItem.setStatus(source.isAutoPublish() ? "ACTIVE" : "REVIEW");
        RawItem savedRawItem = rawItems.save(rawItem);
        if (!source.isAutoPublish()) {
            return new ArticleImportResponse("ACCEPTED", "Raw item retained for review");
        }
        return projectRawItem(source, savedRawItem);
    }

    private ArticleImportResponse projectRawItem(NewsSource source, RawItem savedRawItem) {
        ClusterMatch cluster = stories.findBySourceUrl(savedRawItem.getOriginalUrl())
                .filter(candidate -> candidate.getContentKind() == NewsContentKind.AGGREGATED_STORY)
                .map(candidate -> new ClusterMatch(candidate, 1.0))
                .orElseGet(() -> findCluster(savedRawItem));
        NewsArticle story = cluster == null
                ? stories.save(createStory(source, savedRawItem))
                : cluster.story();

        StoryItem membership = new StoryItem();
        membership.setStory(story);
        membership.setRawItem(savedRawItem);
        membership.setRole(cluster == null ? "PRIMARY" : "SUPPORTING");
        membership.setRelevanceScore(BigDecimal.valueOf(cluster == null ? 1.0 : cluster.score())
                .setScale(4, RoundingMode.HALF_UP));
        storyItems.save(membership);
        updateStoryAfterAttach(story, savedRawItem, cluster == null ? 1.0 : cluster.score());
        return new ArticleImportResponse("ACCEPTED", "Raw item imported");
    }

    private ClusterMatch findCluster(RawItem rawItem) {
        Instant anchor = rawItem.getPublishedAt() == null ? rawItem.getDiscoveredAt() : rawItem.getPublishedAt();
        Set<String> incomingTokens = tokens(rawItem.getTitle(), rawItem.getDescription());
        if (incomingTokens.size() < 3) return null;
        String incomingEvent = eventType(rawItem.getTitle(), rawItem.getDescription());

        // ponytail: bounded O(n) title scan is enough for the MVP; replace with embeddings when 200 candidates/window is insufficient.
        return stories.findClusterCandidates(
                        NewsContentKind.AGGREGATED_STORY,
                        ArticleStatus.PUBLISHED,
                        anchor.minus(CLUSTER_WINDOW),
                        anchor.plus(CLUSTER_WINDOW),
                        PageRequest.of(0, 200)
                ).stream()
                .map(candidate -> match(candidate, incomingTokens, incomingEvent))
                .filter(Objects::nonNull)
                .max(Comparator.comparingDouble(ClusterMatch::score))
                .orElse(null);
    }

    private ClusterMatch match(NewsArticle candidate, Set<String> incomingTokens, String incomingEvent) {
        String candidateEvent = eventType(candidate.getTitle(), candidate.getSummary());
        if (!incomingEvent.equals(candidateEvent) && !"OTHER".equals(incomingEvent) && !"OTHER".equals(candidateEvent)) {
            return null;
        }
        Set<String> candidateTokens = tokens(candidate.getTitle(), candidate.getSummary());
        Set<String> common = new HashSet<>(incomingTokens);
        common.retainAll(candidateTokens);
        if (common.size() < 3) return null;
        Set<String> union = new HashSet<>(incomingTokens);
        union.addAll(candidateTokens);
        double score = (double) common.size() / union.size();
        return score >= 0.50 ? new ClusterMatch(candidate, score) : null;
    }

    private Set<String> tokens(String... values) {
        String text = Arrays.stream(values)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.joining(" "));
        if (text.isBlank()) return Set.of();
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

    private String eventType(String... values) {
        String text = String.join(" ", Arrays.stream(values).filter(Objects::nonNull).toList()).toLowerCase(Locale.ROOT);
        if (containsAny(text, "rumour", "rumor", "linked", "interest in")) return "RUMOUR";
        if (containsAny(text, "sign", "transfer", "deal", "medical", "contract")) return "TRANSFER";
        if (containsAny(text, "injury", "injured", "fitness", "ruled out")) return "INJURY";
        if (containsAny(text, "beat", "draw", "wins", "won", "score", "match report")) return "MATCH";
        return "OTHER";
    }

    private boolean containsAny(String text, String... terms) {
        return Arrays.stream(terms).anyMatch(text::contains);
    }

    private String stem(String token) {
        String stem = token;
        if (stem.length() > 5 && stem.endsWith("ing")) stem = stem.substring(0, stem.length() - 3);
        else if (stem.length() > 4 && stem.endsWith("ed")) stem = stem.substring(0, stem.length() - 2);
        else if (stem.length() > 4 && stem.endsWith("s")) stem = stem.substring(0, stem.length() - 1);
        if (stem.length() > 4 && stem.endsWith("e")) stem = stem.substring(0, stem.length() - 1);
        return stem;
    }

    private void updateStoryAfterAttach(NewsArticle story, RawItem rawItem, double similarity) {
        long sourceCount = Math.max(1, storyItems.countDistinctPublishersByStoryId(story.getId()));
        story.setSourceCountCached((int) sourceCount);
        if (rawItem.getPublisher() != null && rawItem.getPublisher().isOfficial()) {
            story.setVerificationStatus(VerificationStatus.OFFICIAL);
        } else if (story.getVerificationStatus() != VerificationStatus.OFFICIAL
                && "RUMOUR".equals(eventType(rawItem.getTitle(), rawItem.getDescription()))) {
            story.setVerificationStatus(VerificationStatus.RUMOUR);
        } else if (story.getVerificationStatus() != VerificationStatus.OFFICIAL && sourceCount > 1) {
            story.setVerificationStatus(VerificationStatus.MULTIPLE_REPORTS);
        }
        Instant sourceTime = rawItem.getPublishedAt() == null ? rawItem.getDiscoveredAt() : rawItem.getPublishedAt();
        if (story.getFirstSourceAt() == null || sourceTime.isBefore(story.getFirstSourceAt())) {
            story.setFirstSourceAt(sourceTime);
        }
        if (story.getLastSourceAt() == null || sourceTime.isAfter(story.getLastSourceAt())) {
            story.setLastSourceAt(sourceTime);
        }
        refreshPrimarySource(story);
        story.setConfidenceScore(BigDecimal.valueOf(similarity).setScale(4, RoundingMode.HALF_UP));
        story.setLastMaterialChangeAt(Instant.now());
        stories.save(story);
    }

    private void refreshPrimarySource(NewsArticle story) {
        StoryItem primary = storyItems.findSourcesByStoryId(story.getId()).stream()
                .max(Comparator
                        .comparing((StoryItem item) -> item.getRawItem().getPublisher() != null
                                && item.getRawItem().getPublisher().isOfficial())
                        .thenComparing(item -> item.getRawItem().getPublisher() == null
                                ? BigDecimal.ZERO
                                : item.getRawItem().getPublisher().getTrustScore())
                        .thenComparing(item -> item.getRawItem().getPublishedAt() == null
                                ? item.getRawItem().getDiscoveredAt()
                                : item.getRawItem().getPublishedAt())
                        .thenComparing(item -> item.getRawItem().getDescription() != null
                                && !item.getRawItem().getDescription().isBlank()))
                .orElseThrow();

        storyItems.clearPrimaryRole(story.getId());
        primary.setRole("PRIMARY");
        storyItems.save(primary);

        RawItem rawItem = primary.getRawItem();
        story.setHeroRawItem(rawItem);
        story.setSource(rawItem.getConnector());
        story.setSourceUrl(rawItem.getOriginalUrl());
        story.setTitle(limit(rawItem.getTitle(), 200));
        story.setSummary(storySummary(rawItem));
        story.setImageUrl(rawItem.getImageUrl());
        story.setMediaType(rawItem.getEmbedUrl() != null ? "EMBED" : rawItem.getImageUrl() != null ? "IMAGE" : "NONE");
        story.setSummaryBasisHash(rawItem.getRevisionFingerprint());
    }

    private void validateContract(NormalizedItemImportRequest request) {
        if (request.schemaVersion() != 1) {
            throw new IllegalArgumentException("Unsupported schema version");
        }
        if (!request.idempotencyKey().matches("(?i)[a-f0-9]{64}")
                || !request.revisionFingerprint().matches("(?i)[a-f0-9]{64}")) {
            throw new IllegalArgumentException("Invalid fingerprint");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
        validateExternalLink(request.originalUrl());
        if (request.canonicalUrl() != null) {
            validateExternalLink(request.canonicalUrl());
        }
    }

    private void validateExternalLink(String value) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            if (scheme == null
                    || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))
                    || uri.getHost() == null
                    || uri.getUserInfo() != null) {
                throw new IllegalArgumentException("Invalid external URL");
            }
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Invalid external URL", exception);
        }
    }

    private void apply(
            RawItem rawItem,
            NewsSource source,
            NormalizedItemImportRequest request
    ) {
        rawItem.setConnector(source);
        rawItem.setPublisher(source.getPublisher());
        rawItem.setProvider(request.provider().trim().toLowerCase(Locale.ROOT));
        rawItem.setExternalId(blankToNull(request.externalId()));
        rawItem.setIdentityKey(request.identityKey().trim());
        rawItem.setRevisionFingerprint(request.revisionFingerprint().toLowerCase(Locale.ROOT));
        rawItem.setOriginalUrl(request.originalUrl().trim());
        rawItem.setCanonicalUrl(blankToNull(request.canonicalUrl()));
        rawItem.setCanonicalUrlHash(sha256(request.canonicalUrl() == null
                ? request.originalUrl()
                : request.canonicalUrl()));
        rawItem.setContentType(request.contentType());
        rawItem.setTitle(limit(plain(request.title()), 500));
        rawItem.setDescription(limit(plain(request.description()), 5000));
        rawItem.setAuthorName(request.author() == null ? null : limit(plain(request.author().name()), 200));
        rawItem.setAuthorUsername(request.author() == null ? null : limit(plain(request.author().username()), 120));
        rawItem.setImageUrl(primaryImage(request));
        rawItem.setEmbedUrl(primaryEmbed(request));
        rawItem.setLanguage(blankToNull(request.language()));
        rawItem.setPublishedAt(request.publishedAt());
        rawItem.setModifiedAt(request.modifiedAt());
        rawItem.setDiscoveredAt(request.collectedAt());
        rawItem.setPayloadVersion(request.schemaVersion());
    }

    private NewsArticle createStory(NewsSource source, RawItem rawItem) {
        Instant publishedAt = rawItem.getPublishedAt() == null ? Instant.now() : rawItem.getPublishedAt();
        NewsArticle story = new NewsArticle();
        story.setTitle(limit(rawItem.getTitle(), 200));
        story.setSlug(SlugUtil.uniqueSlug(story.getTitle()));
        story.setSummary(storySummary(rawItem));
        story.setContent("");
        story.setContentKind(NewsContentKind.AGGREGATED_STORY);
        story.setStatus(ArticleStatus.PUBLISHED);
        story.setSource(source);
        story.setSourceUrl(rawItem.getOriginalUrl());
        story.setContentHash(sha256(rawItem.getIdentityKey()));
        story.setPublishedAt(publishedAt);
        story.setVerificationStatus(source.getPublisher() != null && source.getPublisher().isOfficial()
                ? VerificationStatus.OFFICIAL
                : VerificationStatus.SINGLE_REPORT);
        story.setImageUrl(rawItem.getImageUrl());
        story.setMediaType(rawItem.getEmbedUrl() != null ? "EMBED" : rawItem.getImageUrl() != null ? "IMAGE" : "NONE");
        story.setFirstSourceAt(publishedAt);
        story.setLastSourceAt(publishedAt);
        story.setLastMaterialChangeAt(Instant.now());
        story.setSourceCountCached(1);
        story.setSummaryBasisHash(rawItem.getRevisionFingerprint());
        story.setHeroRawItem(rawItem);
        return story;
    }

    private void updateStory(NewsArticle story, RawItem rawItem) {
        double confidence = story.getConfidenceScore() == null ? 1.0 : story.getConfidenceScore().doubleValue();
        updateStoryAfterAttach(story, rawItem, confidence);
    }

    private String primaryImage(NormalizedItemImportRequest request) {
        if (request.media() == null) return null;
        return request.media().stream()
                .filter(media -> "IMAGE".equalsIgnoreCase(media.type()) || media.thumbnailUrl() != null)
                .map(media -> media.thumbnailUrl() != null ? media.thumbnailUrl() : media.url())
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    private String primaryEmbed(NormalizedItemImportRequest request) {
        if (request.media() == null) return null;
        return request.media().stream()
                .filter(media -> "EMBED".equalsIgnoreCase(media.type()))
                .map(NormalizedItemImportRequest.Media::url)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    private String plain(String value) {
        return value == null ? null : Jsoup.parse(value).text().trim();
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private String storySummary(RawItem rawItem) {
        return limit(
                rawItem.getDescription() == null || rawItem.getDescription().isBlank()
                        ? rawItem.getTitle()
                        : rawItem.getDescription(),
                500
        );
    }

    private String limit(String value, int max) {
        if (value == null || value.length() <= max) return value;
        return value.substring(0, max - 3) + "...";
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256")
                            .digest(value.getBytes(StandardCharsets.UTF_8))
            );
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to calculate content identity", exception);
        }
    }

    private record ClusterMatch(NewsArticle story, double score) {
    }
}
