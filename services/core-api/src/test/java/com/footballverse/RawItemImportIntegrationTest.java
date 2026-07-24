package com.footballverse;

import com.footballverse.news.dto.NormalizedItemImportRequest;
import com.footballverse.news.model.NewsContentKind;
import com.footballverse.news.model.NewsSource;
import com.footballverse.news.model.Publisher;
import com.footballverse.news.model.RawContentType;
import com.footballverse.news.model.RawItem;
import com.footballverse.news.model.VerificationStatus;
import com.footballverse.news.repository.NewsSourceRepository;
import com.footballverse.news.repository.PublisherRepository;
import com.footballverse.news.repository.RawItemRepository;
import com.footballverse.news.repository.StoryItemRepository;
import com.footballverse.news.repository.StoryKeyPointRepository;
import com.footballverse.news.repository.KeyPointEvidenceRepository;
import com.footballverse.news.service.RawItemImportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = "app.crawl.startup-enabled=false")
@Transactional
class RawItemImportIntegrationTest {
    @Autowired
    private RawItemImportService importService;

    @Autowired
    private PublisherRepository publishers;

    @Autowired
    private NewsSourceRepository sources;

    @Autowired
    private RawItemRepository rawItems;

    @Autowired
    private StoryItemRepository storyItems;

    @Autowired
    private StoryKeyPointRepository keyPoints;

    @Autowired
    private KeyPointEvidenceRepository evidence;

    @Test
    void importsMetadataAndKeepsStableStoryIdentityAcrossRevision() {
        String suffix = UUID.randomUUID().toString();
        Publisher publisher = publishers.save(new Publisher("Publisher " + suffix));
        NewsSource source = new NewsSource(
                "Connector " + suffix,
                "https://example.com/" + suffix + "/feed.xml"
        );
        source.setPublisher(publisher);
        source.setProvider("rss");
        source.setAutoPublish(true);
        source = sources.save(source);

        String identity = "rss:" + source.getId() + ":story-1";
        var first = importService.importItem(request(
                source.getId(),
                identity,
                "a".repeat(64),
                "Initial summary"
        ));
        assertThat(first.status()).isEqualTo("ACCEPTED");

        var rawItem = rawItems.findByIdentityKey(identity).orElseThrow();
        var firstMembership = storyItems.findFirstByRawItem(rawItem).orElseThrow();
        Long storyId = firstMembership.getStory().getId();
        assertThat(firstMembership.getStory().getContentKind()).isEqualTo(NewsContentKind.AGGREGATED_STORY);
        assertThat(firstMembership.getStory().getContent()).isEmpty();
        assertThat(firstMembership.getStory().getSourceUrl()).contains("/story");

        var duplicate = importService.importItem(request(
                source.getId(),
                identity,
                "a".repeat(64),
                "Initial summary"
        ));
        assertThat(duplicate.status()).isEqualTo("EXISTS");

        var correction = importService.importItem(request(
                source.getId(),
                identity,
                "b".repeat(64),
                "Corrected summary"
        ));
        assertThat(correction.status()).isEqualTo("UPDATED");

        var correctedRawItem = rawItems.findByIdentityKey(identity).orElseThrow();
        var correctedMembership = storyItems.findFirstByRawItem(correctedRawItem).orElseThrow();
        assertThat(correctedMembership.getStory().getId()).isEqualTo(storyId);
        assertThat(correctedMembership.getStory().getSummary()).isEqualTo("Corrected summary");
    }

    @Test
    void clustersSimilarHeadlinesFromIndependentPublishers() {
        String suffix = UUID.randomUUID().toString();
        NewsSource firstSource = source("First publisher " + suffix, suffix + "/first");
        NewsSource secondSource = source("Second publisher " + suffix, suffix + "/second");
        secondSource.getPublisher().setOfficial(true);
        publishers.save(secondSource.getPublisher());

        importService.importItem(request(
                firstSource.getId(),
                "rss:" + firstSource.getId() + ":story-a",
                "c".repeat(64),
                "First account",
                "Liverpool completes signing of Example Player",
                "https://example.com/" + suffix + "/first-story",
                "story-a"
        ));
        importService.importItem(request(
                secondSource.getId(),
                "rss:" + secondSource.getId() + ":story-b",
                "d".repeat(64),
                "Second account",
                "Example Player signs for Liverpool after transfer completed",
                "https://example.org/" + suffix + "/second-story",
                "story-b"
        ));

        var firstRaw = rawItems.findByIdentityKey("rss:" + firstSource.getId() + ":story-a").orElseThrow();
        var secondRaw = rawItems.findByIdentityKey("rss:" + secondSource.getId() + ":story-b").orElseThrow();
        var firstMembership = storyItems.findFirstByRawItem(firstRaw).orElseThrow();
        var secondMembership = storyItems.findFirstByRawItem(secondRaw).orElseThrow();

        assertThat(secondMembership.getStory().getId()).isEqualTo(firstMembership.getStory().getId());
        assertThat(secondMembership.getStory().getSourceCountCached()).isEqualTo(2);
        assertThat(secondMembership.getStory().getVerificationStatus())
                .isEqualTo(VerificationStatus.OFFICIAL);
        assertThat(storyItems.findSourcesByStoryId(firstMembership.getStory().getId())).hasSize(2);
        assertThat(secondMembership.getStory().getHeroRawItem().getId()).isEqualTo(secondRaw.getId());
    }

    private NewsSource source(String name, String path) {
        Publisher publisher = publishers.save(new Publisher(name));
        NewsSource source = new NewsSource(name, "https://example.com/" + path + "/feed.xml");
        source.setPublisher(publisher);
        source.setProvider("rss");
        source.setAutoPublish(true);
        return sources.save(source);
    }

    @Test
    void retainsUnapprovedSourceMetadataForReviewWithoutCreatingStory() {
        String suffix = UUID.randomUUID().toString();
        Publisher publisher = publishers.save(new Publisher("Review publisher " + suffix));
        NewsSource source = new NewsSource("Review connector " + suffix, "https://example.com/" + suffix + "/feed.xml");
        source.setPublisher(publisher);
        source.setProvider("rss");
        source = sources.save(source);

        String identity = "rss:" + source.getId() + ":review";
        assertThat(importService.importItem(request(source.getId(), identity, "e".repeat(64), "Review only")).status())
                .isEqualTo("ACCEPTED");

        RawItem rawItem = rawItems.findByIdentityKey(identity).orElseThrow();
        assertThat(rawItem.getStatus()).isEqualTo("REVIEW");
        assertThat(storyItems.findFirstByRawItem(rawItem)).isEmpty();
    }

    @Test
    void doesNotClusterDifferentFootballEventTypesJustBecauseTheClubMatches() {
        String suffix = UUID.randomUUID().toString();
        NewsSource firstSource = source("Events one " + suffix, suffix + "/one");
        NewsSource secondSource = source("Events two " + suffix, suffix + "/two");

        importService.importItem(request(firstSource.getId(), "rss:" + firstSource.getId() + ":transfer", "f".repeat(64),
                "Liverpool complete a transfer", "Liverpool complete signing of Example Player",
                "https://example.com/" + suffix + "/transfer", "transfer"));
        importService.importItem(request(secondSource.getId(), "rss:" + secondSource.getId() + ":match", "1".repeat(64),
                "Liverpool match report", "Liverpool beat Example Player's former club in match report",
                "https://example.org/" + suffix + "/match", "match"));

        RawItem transfer = rawItems.findByIdentityKey("rss:" + firstSource.getId() + ":transfer").orElseThrow();
        RawItem match = rawItems.findByIdentityKey("rss:" + secondSource.getId() + ":match").orElseThrow();
        assertThat(storyItems.findFirstByRawItem(transfer).orElseThrow().getStory().getId())
                .isNotEqualTo(storyItems.findFirstByRawItem(match).orElseThrow().getStory().getId());
    }

    @Test
    void marksUnconfirmedTransferLanguageAsRumour() {
        String suffix = UUID.randomUUID().toString();
        NewsSource source = source("Rumour source " + suffix, suffix + "/rumour");
        String identity = "rss:" + source.getId() + ":rumour";

        importService.importItem(request(source.getId(), identity, "2".repeat(64),
                "Liverpool are linked with Example Player but no agreement is confirmed.",
                "Liverpool linked with Example Player in transfer rumour",
                "https://example.com/" + suffix + "/rumour", "rumour"));

        RawItem rawItem = rawItems.findByIdentityKey(identity).orElseThrow();
        assertThat(storyItems.findFirstByRawItem(rawItem).orElseThrow().getStory().getVerificationStatus())
                .isEqualTo(VerificationStatus.RUMOUR);
    }

    @Test
    void clustersMultipleSourcesAndUpdatesVerificationStatus() {
        String suffix = UUID.randomUUID().toString();
        NewsSource firstSource = source("Fee one " + suffix, suffix + "/fee-one");
        NewsSource secondSource = source("Fee two " + suffix, suffix + "/fee-two");

        importService.importItem(request(firstSource.getId(), "rss:" + firstSource.getId() + ":fee-one", "3".repeat(64),
                "Liverpool complete the €50m transfer for Example Player.",
                "Liverpool complete signing of Example Player", "https://example.com/" + suffix + "/fee-one", "fee-one"));
        importService.importItem(request(secondSource.getId(), "rss:" + secondSource.getId() + ":fee-two", "4".repeat(64),
                "Example Player signs for Liverpool in a €60m transfer.",
                "Example Player signs for Liverpool after transfer completed", "https://example.org/" + suffix + "/fee-two", "fee-two"));

        RawItem rawItem = rawItems.findByIdentityKey("rss:" + firstSource.getId() + ":fee-one").orElseThrow();
        Long storyId = storyItems.findFirstByRawItem(rawItem).orElseThrow().getStory().getId();

        assertThat(storyItems.findFirstByRawItem(rawItem).orElseThrow().getStory().getSourceCountCached())
                .isEqualTo(2);
        assertThat(storyItems.findSourcesByStoryId(storyId)).hasSize(2);
    }

    private NormalizedItemImportRequest request(
            Long sourceId,
            String identity,
            String revision,
            String description
    ) {
        return request(
                sourceId,
                identity,
                revision,
                description,
                "Club confirms transfer",
                "https://example.com/story",
                "story-1"
        );
    }

    private NormalizedItemImportRequest request(
            Long sourceId,
            String identity,
            String revision,
            String description,
            String title,
            String url,
            String externalId
    ) {
        return new NormalizedItemImportRequest(
                1,
                revision,
                identity,
                revision,
                sourceId,
                "rss",
                externalId,
                RawContentType.ARTICLE,
                url,
                url,
                title,
                description,
                new NormalizedItemImportRequest.Author("Example Football", null),
                List.of(new NormalizedItemImportRequest.Media(
                        "IMAGE",
                        "https://cdn.example.com/story.jpg",
                        null,
                        null
                )),
                "en",
                Instant.parse("2026-07-23T08:00:00Z"),
                Instant.parse("2026-07-23T08:00:00Z"),
                Instant.parse("2026-07-23T08:01:00Z"),
                Map.of()
        );
    }
}
