package com.footballverse;

import com.footballverse.news.clustering.StoryClusterProfile;
import com.footballverse.news.clustering.StoryClusterProfileRepository;
import com.footballverse.news.clustering.StoryClusteringService;
import com.footballverse.news.clustering.VectorConverter;
import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsContentKind;
import com.footballverse.news.model.NewsSource;
import com.footballverse.news.model.Publisher;
import com.footballverse.news.model.RawContentType;
import com.footballverse.news.model.RawItem;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.news.repository.NewsSourceRepository;
import com.footballverse.news.repository.PublisherRepository;
import com.footballverse.news.repository.RawItemRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class VectorPgvectorIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector/pgvector:pg16")
            .withDatabaseName("football_verse_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired
    private RawItemRepository rawItems;

    @Autowired
    private NewsArticleRepository stories;

    @Autowired
    private PublisherRepository publishers;

    @Autowired
    private NewsSourceRepository sources;

    @Autowired
    private StoryClusterProfileRepository profileRepository;

    @Autowired
    private StoryClusteringService storyClusteringService;

    @Test
    void verifiesPgvectorExtensionMigrationAndCosineSearch() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Publisher publisher = publishers.save(new Publisher("Pgvector Publisher " + suffix));
        NewsSource source = new NewsSource("Pgvector Source " + suffix, "https://pgvector.example.com/" + suffix);
        source.setPublisher(publisher);
        source.setProvider("rss");
        source.setAutoPublish(true);
        source = sources.save(source);

        // 1. Create and persist raw item with 384-dimensional vector
        RawItem item = new RawItem();
        item.setConnector(source);
        item.setPublisher(publisher);
        item.setProvider("rss");
        item.setIdentityKey("pgvector-item-" + suffix);
        item.setRevisionFingerprint("a".repeat(64));
        item.setOriginalUrl("https://pgvector.example.com/item-" + suffix);
        item.setContentType(RawContentType.ARTICLE);
        item.setTitle("pgvector Integration Test Title " + suffix);
        item.setDescription("Testing PostgreSQL pgvector extension and cosine search");
        item.setDiscoveredAt(Instant.now());
        item.setPayloadVersion(2);
        item.setEmbeddingModel("intfloat/multilingual-e5-small");
        item.setEmbeddingRevision("v1.0");
        item.setEmbeddedAt(Instant.now());

        float[] vector = new float[384];
        for (int i = 0; i < 384; i++) {
            vector[i] = 0.05f;
        }
        item.setEmbedding(vector);

        RawItem savedItem = rawItems.save(item);
        assertThat(savedItem.getId()).isNotNull();

        // 2. Create story and cluster profile with centroid vector
        NewsArticle story = new NewsArticle();
        story.setTitle("pgvector Story " + suffix);
        story.setSlug("pgvector-story-" + suffix);
        story.setSummary("Summary");
        story.setContent("");
        story.setContentKind(NewsContentKind.AGGREGATED_STORY);
        story.setStatus(ArticleStatus.PUBLISHED);
        story.setSource(source);
        story.setSourceUrl("https://pgvector.example.com/story-" + suffix);
        story.setPublishedAt(Instant.now());
        story.setLastSourceAt(Instant.now());
        NewsArticle savedStory = stories.save(story);

        StoryClusterProfile profile = new StoryClusterProfile(
                savedStory.getId(),
                vector,
                "intfloat/multilingual-e5-small",
                "v1.0",
                1
        );
        profileRepository.save(profile);

        // 3. Perform native pgvector cosine search (<=>)
        String vectorStr = new VectorConverter().convertToDatabaseColumn(vector);
        List<StoryClusterProfileRepository.CandidateVectorMatch> matches = profileRepository.findVectorCandidates(
                vectorStr,
                Instant.now().minusSeconds(86400),
                Instant.now().plusSeconds(86400),
                "intfloat/multilingual-e5-small",
                10
        );

        assertThat(matches).isNotEmpty();
        assertThat(matches.get(0).getStoryId()).isEqualTo(savedStory.getId());
        assertThat(matches.get(0).getSemanticScore()).isGreaterThan(0.99);

        // 4. Verify PostgreSQL advisory lock acquisition
        storyClusteringService.acquireAdvisoryLock();
    }
}
