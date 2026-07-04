package com.footballverse.news;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {
    Page<NewsArticle> findByStatus(ArticleStatus status, Pageable pageable);

    Page<NewsArticle> findByStatusNot(ArticleStatus status, Pageable pageable);

    long countByStatus(ArticleStatus status);

    Optional<NewsArticle> findBySlugAndStatus(String slug, ArticleStatus status);

    Optional<NewsArticle> findByIdAndStatus(Long id, ArticleStatus status);

    Optional<NewsArticle> findByIdAndStatusNot(Long id, ArticleStatus status);

    Optional<NewsArticle> findBySourceUrl(String sourceUrl);

    @Modifying
    @Query("update NewsArticle a set a.source = null where a.source.id = :sourceId")
    void detachSource(Long sourceId);

    boolean existsBySourceUrl(String sourceUrl);

    boolean existsByContentHash(String contentHash);

    boolean existsBySlug(String slug);
}
