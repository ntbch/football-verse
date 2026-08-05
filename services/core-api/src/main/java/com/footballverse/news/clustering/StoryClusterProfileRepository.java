package com.footballverse.news.clustering;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface StoryClusterProfileRepository extends JpaRepository<StoryClusterProfile, Long> {

    @Query(value = """
        SELECT
            profile.story_id AS storyId,
            1.0 - (profile.centroid <=> CAST(:vectorStr AS vector)) AS semanticScore
        FROM story_cluster_profiles profile
        JOIN news_articles article ON article.id = profile.story_id
        WHERE article.content_kind = 'AGGREGATED_STORY'
          AND article.status = 'PUBLISHED'
          AND article.last_source_at >= :windowStart
          AND article.last_source_at <= :windowEnd
          AND profile.model = :model
          AND profile.model_revision = :modelRevision
          AND profile.centroid IS NOT NULL
        ORDER BY profile.centroid <=> CAST(:vectorStr AS vector)
        LIMIT :limitCount
        """, nativeQuery = true)
    List<CandidateVectorMatch> findVectorCandidates(
            @Param("vectorStr") String vectorStr,
            @Param("windowStart") Instant windowStart,
            @Param("windowEnd") Instant windowEnd,
            @Param("model") String model,
            @Param("modelRevision") String modelRevision,
            @Param("limitCount") int limitCount
    );

    interface CandidateVectorMatch {
        Long getStoryId();
        Double getSemanticScore();
    }
}