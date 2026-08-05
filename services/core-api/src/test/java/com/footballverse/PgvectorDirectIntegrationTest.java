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
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("pgvectortest")
@Transactional
@EnabledIfEnvironmentVariable(named = "PGVECTOR_TEST", matches = "true")
class PgvectorDirectIntegrationTest {

    @MockBean private StringRedisTemplate redisTemplate;

    @Autowired private RawItemRepository rawItems;
    @Autowired private NewsArticleRepository stories;
    @Autowired private PublisherRepository publishers;
    @Autowired private NewsSourceRepository sources;
    @Autowired private StoryClusterProfileRepository profileRepository;
    @Autowired private StoryClusteringService storyClusteringService;

    @Test
    void flywayMigrationCreatesVectorColumn() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Publisher publisher = publishers.save(new Publisher("PGV Publisher " + suffix));
        NewsSource source = new NewsSource("PGV Source " + suffix, "https://pgv.example.com/" + suffix);
        source.setPublisher(publisher);
        source.setProvider("rss");
        source.setAutoPublish(true);
        source = sources.save(source);

        RawItem item = new RawItem();
        item.setConnector(source);
        item.setPublisher(publisher);
        item.setProvider("rss");
        item.setIdentityKey("pgv-item-" + suffix);
        item.setRevisionFingerprint("a".repeat(64));
        item.setOriginalUrl("https://pgv.example.com/item-" + suffix);
        item.setContentType(RawContentType.ARTICLE);
        item.setTitle("pgvector Direct Test " + suffix);
        item.setDescription("Testing real pgvector extension");
        item.setDiscoveredAt(Instant.now());
        item.setPayloadVersion(2);
        item.setEmbeddingModel("intfloat/multilingual-e5-small");
        item.setEmbeddingRevision("v1.0");
        item.setEmbeddedAt(Instant.now());

        float[] vector = new float[384];
        java.util.Arrays.fill(vector, 0.05f);
        item.setEmbedding(vector);

        RawItem saved = rawItems.save(item);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getEmbedding()).hasSize(384);
    }

    @Test
    void cosineSearchReturnsMatchingProfile() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Publisher publisher = publishers.save(new Publisher("Cosine Publisher " + suffix));
        NewsSource source = new NewsSource("Cosine Source " + suffix, "https://cosine.example.com/" + suffix);
        source.setPublisher(publisher);
        source.setProvider("rss");
        source.setAutoPublish(true);
        source = sources.save(source);

        NewsArticle story = new NewsArticle();
        story.setTitle("Cosine Story " + suffix);
        story.setSlug("cosine-story-" + suffix);
        story.setSummary("Testing cosine similarity");
        story.setContent("");
        story.setContentKind(NewsContentKind.AGGREGATED_STORY);
        story.setStatus(ArticleStatus.PUBLISHED);
        story.setSource(source);
        story.setSourceUrl("https://cosine.example.com/story-" + suffix);
        story.setPublishedAt(Instant.now());
        story.setLastSourceAt(Instant.now());
        NewsArticle savedStory = stories.save(story);

        float[] centroid = new float[384];
        java.util.Arrays.fill(centroid, 0.05f);

        StoryClusterProfile profile = new StoryClusterProfile(
                savedStory.getId(), centroid, "intfloat/multilingual-e5-small", "v1.0", 1);
        profileRepository.save(profile);

        String vectorStr = new VectorConverter().convertToDatabaseColumn(centroid);
        List<StoryClusterProfileRepository.CandidateVectorMatch> matches = profileRepository.findVectorCandidates(
                vectorStr,
                Instant.now().minusSeconds(86400),
                Instant.now().plusSeconds(86400),
                "intfloat/multilingual-e5-small",
                "v1.0",
                10
        );

        assertThat(matches).isNotEmpty();
        assertThat(matches.get(0).getStoryId()).isEqualTo(savedStory.getId());
        assertThat(matches.get(0).getSemanticScore()).isGreaterThan(0.99);
    }

    @Test
    void advisoryLockAcquiresWithoutError() {
        storyClusteringService.acquireAdvisoryLock();
    }
}
