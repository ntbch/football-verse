package com.footballverse.news.repository;

import com.footballverse.news.model.NewsAiEnrichmentOutbox;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface NewsAiEnrichmentOutboxRepository extends JpaRepository<NewsAiEnrichmentOutbox, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from NewsAiEnrichmentOutbox item join fetch item.story "
            + "where ((item.status = 'PENDING') or (item.status = 'PROCESSING')) "
            + "and item.nextAttemptAt <= :now order by item.createdAt")
    List<NewsAiEnrichmentOutbox> findPendingForUpdate(@Param("now") Instant now, Pageable pageable);

    Optional<NewsAiEnrichmentOutbox> findByStoryIdAndSummaryBasisHash(Long storyId, String summaryBasisHash);
}
