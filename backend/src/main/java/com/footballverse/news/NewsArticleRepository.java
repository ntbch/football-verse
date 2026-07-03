package com.footballverse.news;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {
    Page<NewsArticle> findByStatus(ArticleStatus status, Pageable pageable);

    Page<NewsArticle> findByStatusNot(ArticleStatus status, Pageable pageable);

    Optional<NewsArticle> findBySlugAndStatus(String slug, ArticleStatus status);

    Optional<NewsArticle> findByIdAndStatusNot(Long id, ArticleStatus status);

    boolean existsBySourceUrl(String sourceUrl);

    boolean existsByContentHash(String contentHash);

    boolean existsBySlug(String slug);
}
