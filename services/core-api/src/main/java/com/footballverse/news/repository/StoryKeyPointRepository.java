package com.footballverse.news.repository;

import com.footballverse.news.model.StoryKeyPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface StoryKeyPointRepository extends JpaRepository<StoryKeyPoint, Long> {
    List<StoryKeyPoint> findByStoryIdOrderByOrdinalAsc(Long storyId);
    Optional<StoryKeyPoint> findByStoryIdAndOrdinal(Long storyId, int ordinal);
    void deleteByStoryIdAndOrdinal(Long storyId, int ordinal);

    /**
     * Bulk delete that executes immediately. A derived deleteByStoryId defers
     * the DELETE until flush, which runs AFTER pending INSERTs — rewriting a
     * story's points then collided with uq_story_key_points_ordinal.
     */
    @Modifying
    @Query("delete from StoryKeyPoint k where k.story.id = :storyId")
    void deleteAllForStory(@Param("storyId") Long storyId);
}
