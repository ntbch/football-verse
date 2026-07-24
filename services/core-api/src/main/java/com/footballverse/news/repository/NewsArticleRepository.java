package com.footballverse.news.repository;
import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsContentKind;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.time.Instant;

public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {
    @Query("SELECT DISTINCT a FROM NewsArticle a " +
           "LEFT JOIN a.tags t " +
           "LEFT JOIN a.source s " +
           "WHERE a.status = 'PUBLISHED' AND (" +
           "  (:hasCategories = false AND :hasTags = false) OR " +
           "  (:hasCategories = true AND a.category.id IN :categoryIds) OR " +
           "  (:hasTags = true AND t.id IN :tagIds)" +
           ") AND (" +
           "  :hasProvider = false OR " +
           "  (:provider = 'youtube' AND s.provider = 'youtube') OR " +
           "  (:provider = 'news' AND (s.provider IS NULL OR s.provider <> 'youtube'))" +
           ")")
    Page<NewsArticle> filterPublishedArticles(
            boolean hasCategories,
            List<Long> categoryIds,
            boolean hasTags,
            List<Long> tagIds,
            boolean hasProvider,
            String provider,
            Pageable pageable
    );

    Page<NewsArticle> findByStatus(ArticleStatus status, Pageable pageable);

    @Query("SELECT DISTINCT a FROM NewsArticle a WHERE a.status = com.footballverse.news.model.ArticleStatus.PUBLISHED AND " +
           "(LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(a.content) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<NewsArticle> searchPublishedArticles(String query, Pageable pageable);

    @Query("SELECT a FROM NewsArticle a WHERE " +
           "a.status <> 'DELETED' " +
           "AND (:hasStatus = false OR a.status = :status) " +
           "AND (:search = '' OR LOWER(a.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(a.category.name) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:categoryId IS NULL OR a.category.id = :categoryId) " +
           "AND (:hasDate = false OR (a.publishedAt IS NOT NULL AND a.publishedAt >= :startDate AND a.publishedAt <= :endDate))")
    Page<NewsArticle> adminFilterArticles(
            @org.springframework.data.repository.query.Param("hasStatus") boolean hasStatus,
            @org.springframework.data.repository.query.Param("status") ArticleStatus status,
            @org.springframework.data.repository.query.Param("search") String search,
            @org.springframework.data.repository.query.Param("categoryId") Long categoryId,
            @org.springframework.data.repository.query.Param("hasDate") boolean hasDate,
            @org.springframework.data.repository.query.Param("startDate") java.time.Instant startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.Instant endDate,
            Pageable pageable
    );

    @Query("SELECT COUNT(a) FROM NewsArticle a WHERE " +
           "a.status = :status " +
           "AND (:search = '' OR LOWER(a.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(a.category.name) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:categoryId IS NULL OR a.category.id = :categoryId) " +
           "AND (:hasDate = false OR (a.publishedAt IS NOT NULL AND a.publishedAt >= :startDate AND a.publishedAt <= :endDate))")
    long adminCountStatus(
            @org.springframework.data.repository.query.Param("status") ArticleStatus status,
            @org.springframework.data.repository.query.Param("search") String search,
            @org.springframework.data.repository.query.Param("categoryId") Long categoryId,
            @org.springframework.data.repository.query.Param("hasDate") boolean hasDate,
            @org.springframework.data.repository.query.Param("startDate") java.time.Instant startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.Instant endDate
    );

    long countByStatus(ArticleStatus status);

    Optional<NewsArticle> findBySlugAndStatus(String slug, ArticleStatus status);

    Optional<NewsArticle> findByIdAndStatus(Long id, ArticleStatus status);

    Optional<NewsArticle> findByIdAndStatusNot(Long id, ArticleStatus status);

    Optional<NewsArticle> findBySourceUrl(String sourceUrl);

    @Query("""
            select a from NewsArticle a
            where a.contentKind = :contentKind
              and a.status = :status
              and a.lastSourceAt between :start and :end
            order by a.lastSourceAt desc
            """)
    List<NewsArticle> findClusterCandidates(
            NewsContentKind contentKind,
            ArticleStatus status,
            Instant start,
            Instant end,
            Pageable pageable
    );

    @Modifying
    @Query("update NewsArticle a set a.source = null where a.source.id = :sourceId")
    void detachSource(Long sourceId);

    boolean existsBySourceUrl(String sourceUrl);

    boolean existsByContentHash(String contentHash);

    @Query("SELECT a FROM NewsArticle a WHERE a.status = 'PUBLISHED' ORDER BY COALESCE(a.hotScore, 0.0) DESC, a.publishedAt DESC")
    Page<NewsArticle> findTrendingArticles(Pageable pageable);

    boolean existsBySlug(String slug);

    @Query("SELECT a FROM NewsArticle a WHERE a.status = com.footballverse.news.model.ArticleStatus.PUBLISHED AND a.publishedAt >= :since ORDER BY COALESCE(a.hotScore, 0.0) DESC, a.publishedAt DESC")
    List<NewsArticle> findTopTrendingArticles(Instant since, Pageable pageable);
}
