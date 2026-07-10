package com.footballverse.news.repository;
import com.footballverse.news.model.NewsSource;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.time.Instant;
import java.util.List;

public interface NewsSourceRepository extends JpaRepository<NewsSource, Long> {
    List<NewsSource> findByActiveTrue();

    @Modifying
    @Query("UPDATE NewsSource s SET s.lastCrawledAt = :now WHERE s.id = :id AND s.active = true AND (s.lastCrawledAt IS NULL OR s.lastCrawledAt < :cutoff)")
    int acquireCrawlLock(Long id, Instant now, Instant cutoff);

    boolean existsByFeedUrl(String feedUrl);

    boolean existsByName(String name);

    java.util.Optional<NewsSource> findByFeedUrl(String feedUrl);
}
