package com.footballverse;

import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.StoryKeyPoint;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.news.repository.StoryKeyPointRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression guard for the uq_story_key_points_ordinal mass-failure bug.
 * Re-enriching a story rewrites its key points inside one transaction:
 * a derived (deferred) delete flushed AFTER the replacement inserts, so
 * inserting ordinal 1 collided with the still-present old row and every
 * re-enrichment failed permanently.
 */
@SpringBootTest
@TestPropertySource(properties = {
        "app.crawl.startup-enabled=false",
        // The bug only reproduces on the Flyway-managed schema where
        // uq_story_key_points_ordinal exists; the default H2 slice has no
        // unique constraints because Hibernate generates its schema from entities.
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:54320/football_verse",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.datasource.username=football_verse",
        "spring.datasource.password=football_verse",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.flyway.enabled=true"
})
@Transactional
class StoryKeyPointRewriteIntegrationTest {
    @Autowired private NewsArticleRepository articles;
    @Autowired private StoryKeyPointRepository keyPoints;

    @Test
    void rewritingKeyPointsDoesNotViolateStoryOrdinalUniqueness() {
        NewsArticle story = new NewsArticle();
        story.setTitle("Enrichment rewrite " + UUID.randomUUID());
        story.setSlug("enrich-rewrite-" + UUID.randomUUID());
        story = articles.save(story);

        StoryKeyPoint first = point(story, 1);
        StoryKeyPoint second = point(story, 2);
        keyPoints.save(first);
        keyPoints.save(second);
        keyPoints.flush();

        assertThat(keyPoints.findByStoryIdOrderByOrdinalAsc(story.getId())).hasSize(2);

        // Exact production sequence from NewsAiEnrichmentService.complete():
        // wipe the old points, then insert the rewritten list from ordinal 1.
        keyPoints.deleteAllForStory(story.getId());
        StoryKeyPoint fresh = point(story, 1);
        fresh.setText("Rewritten key point");
        keyPoints.save(fresh);
        keyPoints.flush();

        assertThat(keyPoints.findByStoryIdOrderByOrdinalAsc(story.getId())).hasSize(1);
    }

    private StoryKeyPoint point(NewsArticle story, int ordinal) {
        StoryKeyPoint point = new StoryKeyPoint();
        point.setStory(story);
        point.setOrdinal(ordinal);
        point.setText("Key point " + ordinal + " " + UUID.randomUUID());
        point.setConfidence(new java.math.BigDecimal("0.95"));
        return point;
    }
}
