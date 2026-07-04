package com.footballverse.news;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {
    @Query("SELECT DISTINCT a FROM NewsArticle a " +
           "LEFT JOIN a.tags t " +
           "WHERE a.status = 'PUBLISHED' AND (" +
           "  (:hasCategories = false AND :hasTags = false) OR " +
           "  (:hasCategories = true AND a.category.id IN :categoryIds) OR " +
           "  (:hasTags = true AND t.id IN :tagIds)" +
           ")")
    Page<NewsArticle> filterPublishedArticles(
            boolean hasCategories,
            List<Long> categoryIds,
            boolean hasTags,
            List<Long> tagIds,
            Pageable pageable
    );

    Page<NewsArticle> findByStatus(ArticleStatus status, Pageable pageable);

    @Query(value = "SELECT * FROM news_articles a " +
            "WHERE a.status = 'PUBLISHED' AND (" +
            "to_tsvector('simple', a.title || ' ' || COALESCE(a.summary, '') || ' ' || a.content) @@ plainto_tsquery('simple', :query)" +
            " OR LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')))", 
            countQuery = "SELECT count(*) FROM news_articles a " +
            "WHERE a.status = 'PUBLISHED' AND (" +
            "to_tsvector('simple', a.title || ' ' || COALESCE(a.summary, '') || ' ' || a.content) @@ plainto_tsquery('simple', :query)" +
            " OR LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')))",
            nativeQuery = true)
    Page<NewsArticle> searchPublishedArticles(String query, Pageable pageable);

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
