package com.footballverse.news.repository;

import com.footballverse.news.model.RawItem;
import com.footballverse.news.model.StoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface StoryItemRepository extends JpaRepository<StoryItem, Long> {
    Optional<StoryItem> findFirstByRawItem(RawItem rawItem);

    @Query("""
            select count(distinct publisher.id)
            from StoryItem membership
            join membership.rawItem raw
            join raw.publisher publisher
            where membership.story.id = :storyId
            """)
    long countDistinctPublishersByStoryId(@Param("storyId") Long storyId);

    @Query("""
            select membership
            from StoryItem membership
            join fetch membership.rawItem raw
            left join fetch raw.publisher
            join fetch raw.connector
            where membership.story.id = :storyId
            order by membership.addedAt asc
            """)
    List<StoryItem> findSourcesByStoryId(@Param("storyId") Long storyId);

    @Modifying(flushAutomatically = true)
    @Query("update StoryItem membership set membership.role = 'SUPPORTING' " +
           "where membership.story.id = :storyId and membership.role = 'PRIMARY'")
    void clearPrimaryRole(@Param("storyId") Long storyId);
}
