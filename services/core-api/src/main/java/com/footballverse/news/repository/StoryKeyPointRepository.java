package com.footballverse.news.repository;

import com.footballverse.news.model.StoryKeyPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StoryKeyPointRepository extends JpaRepository<StoryKeyPoint, Long> {
    List<StoryKeyPoint> findByStoryIdOrderByOrdinalAsc(Long storyId);
    Optional<StoryKeyPoint> findByStoryIdAndOrdinal(Long storyId, int ordinal);
    void deleteByStoryIdAndOrdinal(Long storyId, int ordinal);
}
