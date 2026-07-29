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
import com.footballverse.news.model.VerificationStatus;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.news.repository.NewsSourceRepository;
import com.footballverse.news.repository.RawItemRepository;
import com.footballverse.news.repository.StoryItemRepository;
import com.footballverse.news.repository.StoryKeyPointRepository;
import com.footballverse.telegram.service.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class RawItemImportService {

    private final RawItemRepository rawItems;
    private final StoryItemRepository storyItems;
    private final NewsArticleRepository stories;
    private final NewsSourceRepository sources;
    private final StoryKeyPointRepository keyPoints;
    private final TelegramNotificationService telegramNotificationService;
    private final AiSummaryService aiSummaryService;
    private final NewsCategoryClassifierService categoryClassifier;
    private final NewsClusteringService clusteringService;
    private final NewsEmbeddingService embeddingService;

    @Transactional
    public ArticleImportResponse importItem(NormalizedItemImportRequest request) {
        validateContract(request);
        if (!isFootballRelated(request)) {
            return new ArticleImportResponse("REJECTED", "Content is not football-related");
        }
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
        NewsClusteringService.ClusterDecision cluster = stories.findBySourceUrl(savedRawItem.getOriginalUrl())
                .filter(candidate -> candidate.getContentKind() == NewsContentKind.AGGREGATED_STORY)
                .map(candidate -> new NewsClusteringService.ClusterDecision(candidate, 1.0, null))
                .orElseGet(() -> clusteringService.findCluster(savedRawItem));

        NewsArticle story = cluster == null
                ? createStory(source, savedRawItem)
                : cluster.story();

        StoryItem membership = new StoryItem();
        membership.setStory(story);
        membership.setRawItem(savedRawItem);
        membership.setRole(cluster == null ? "PRIMARY" : "SUPPORTING");
        membership.setRelevanceScore(BigDecimal.valueOf(cluster == null ? 1.0 : cluster.score())
                .setScale(4, RoundingMode.HALF_UP));
        storyItems.save(membership);

        if (cluster != null && cluster.incomingEmbedding() != null && story.getClusterEmbedding() == null) {
            story.setClusterEmbedding(embeddingService.serialize(cluster.incomingEmbedding()));
            story.setClusterEmbeddingModel(cluster.incomingEmbedding().model());
        }
        updateStoryAfterAttach(story, savedRawItem, cluster == null ? 1.0 : cluster.score());
        telegramNotificationService.checkAndPushBreakingNews(story);
        return new ArticleImportResponse("ACCEPTED", cluster == null
                ? "Raw item imported as a new story"
                : "Raw item grouped into an existing story");
    }

    private void updateStoryAfterAttach(NewsArticle story, RawItem rawItem, double similarity) {
        long sourceCount = Math.max(1, storyItems.countDistinctPublishersByStoryId(story.getId()));
        story.setSourceCountCached((int) sourceCount);
        if (rawItem.getPublisher() != null && rawItem.getPublisher().isOfficial()) {
            story.setVerificationStatus(VerificationStatus.OFFICIAL);
        } else if (story.getVerificationStatus() != VerificationStatus.OFFICIAL
                && "RUMOUR".equals(clusteringService.eventType(rawItem.getTitle(), rawItem.getDescription()))) {
            story.setVerificationStatus(VerificationStatus.RUMOUR);
        } else if (story.getVerificationStatus() != VerificationStatus.OFFICIAL && sourceCount > 1) {
            story.setVerificationStatus(VerificationStatus.MULTIPLE_REPORTS);
        }
        Instant sourceTime = sourceTime(rawItem);
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
                        .thenComparing(item -> sourceTime(item.getRawItem()))
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

    private void apply(RawItem rawItem, NewsSource source, NormalizedItemImportRequest request) {
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
        Instant publishedAt = sourceTime(rawItem);
        NewsArticle story = new NewsArticle();
        story.setTitle(limit(rawItem.getTitle(), 200));
        story.setSlug(SlugUtil.uniqueSlug(story.getTitle()));

        AiSummaryService.SummaryResult aiRes = aiSummaryService.generateSummaryAndKeyPoints(
                rawItem.getTitle(), rawItem.getDescription(), storySummary(rawItem));
        story.setSummary(aiRes.summary());
        story.setContent("");
        story.setContentKind(NewsContentKind.AGGREGATED_STORY);
        story.setStatus(ArticleStatus.PUBLISHED);
        story.setSource(source);
        story.setCategory(categoryClassifier.classify(
                rawItem.getTitle(), rawItem.getDescription(), aiRes.category()));
        story.setSourceUrl(rawItem.getOriginalUrl());
        story.setContentHash(sha256(rawItem.getIdentityKey()));
        story.setPublishedAt(publishedAt);
        story.setVerificationStatus(source.getPublisher() != null && source.getPublisher().isOfficial()
                ? VerificationStatus.OFFICIAL
                : "RUMOUR".equals(clusteringService.eventType(rawItem.getTitle(), rawItem.getDescription()))
                    ? VerificationStatus.RUMOUR
                    : VerificationStatus.SINGLE_REPORT);
        story.setImageUrl(rawItem.getImageUrl());
        story.setMediaType(rawItem.getEmbedUrl() != null ? "EMBED" : rawItem.getImageUrl() != null ? "IMAGE" : "NONE");
        story.setFirstSourceAt(publishedAt);
        story.setLastSourceAt(publishedAt);
        story.setLastMaterialChangeAt(Instant.now());
        story.setSourceCountCached(1);
        story.setSummaryBasisHash(rawItem.getRevisionFingerprint());
        story.setHeroRawItem(rawItem);

        clusteringService.createEmbedding(rawItem).ifPresent(embedding -> {
            story.setClusterEmbedding(embeddingService.serialize(embedding));
            story.setClusterEmbeddingModel(embedding.model());
        });

        NewsArticle savedStory = stories.save(story);
        if (aiRes.keyPoints() != null && !aiRes.keyPoints().isEmpty()) {
            int ordinal = 1;
            for (String point : aiRes.keyPoints()) {
                if (point == null || point.isBlank()) {
                    continue;
                }
                StoryKeyPoint keyPoint = new StoryKeyPoint();
                keyPoint.setStory(savedStory);
                keyPoint.setOrdinal(ordinal++);
                keyPoint.setText(point.trim());
                keyPoint.setConfidence(BigDecimal.valueOf(0.95));
                keyPoints.save(keyPoint);
            }
        }
        return savedStory;
    }

    private void updateStory(NewsArticle story, RawItem rawItem) {
        double confidence = story.getConfidenceScore() == null ? 1.0 : story.getConfidenceScore().doubleValue();
        updateStoryAfterAttach(story, rawItem, confidence);
    }

    private String primaryImage(NormalizedItemImportRequest request) {
        if (request.media() == null) return null;
        return request.media().stream()
                .filter(media -> "IMAGE".equalsIgnoreCase(media.type()) || media.thumbnailUrl() != null)
                .map(media -> "IMAGE".equalsIgnoreCase(media.type()) && media.url() != null
                        ? media.url()
                        : media.thumbnailUrl() != null ? media.thumbnailUrl() : media.url())
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    private String primaryEmbed(NormalizedItemImportRequest request) {
        if (request.media() == null) return null;
        return request.media().stream()
                .filter(media -> "EMBED".equalsIgnoreCase(media.type()) || "VIDEO".equalsIgnoreCase(media.type()))
                .map(NormalizedItemImportRequest.Media::url)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    private String plain(String value) {
        return value == null ? null : Jsoup.parse(value).text().trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String storySummary(RawItem rawItem) {
        return limit(rawItem.getDescription() == null || rawItem.getDescription().isBlank()
                ? rawItem.getTitle()
                : rawItem.getDescription(), 500);
    }

    private String limit(String value, int max) {
        if (value == null || value.length() <= max) return value;
        return value.substring(0, max - 3) + "...";
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256")
                            .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to calculate content identity", exception);
        }
    }

    private Instant sourceTime(RawItem rawItem) {
        if (rawItem.getPublishedAt() != null) return rawItem.getPublishedAt();
        if (rawItem.getDiscoveredAt() != null) return rawItem.getDiscoveredAt();
        return Instant.now();
    }

    private boolean isFootballRelated(NormalizedItemImportRequest request) {
        String text = (Objects.requireNonNullElse(request.title(), "") + " "
                + Objects.requireNonNullElse(request.description(), "") + " "
                + Objects.requireNonNullElse(request.originalUrl(), "")).toLowerCase(Locale.ROOT);

        if (text.contains("/f1/") || text.contains("/tennis/") || text.contains("/racing/")
                || text.contains("/darts/") || text.contains("/cricket/") || text.contains("/golf/")
                || text.contains("/nfl/") || text.contains("/nba/")) {
            return false;
        }

        String[] nonFootballKeywords = {
            "formula 1", "formula one", "hungarian gp", "grand prix", "mercedes f1", "ferrari f1", "red bull racing",
            "wimbledon", "atp tour", "wta tour", "us open tennis", "dc open", "matchplay darts", "silver dominion",
            "pat eddery stakes", "nba draft", "t20 world cup", "pga tour", "super bowl", "tour de france"
        };
        for (String keyword : nonFootballKeywords) {
            if (text.contains(keyword)) return false;
        }
        return true;
    }
}
