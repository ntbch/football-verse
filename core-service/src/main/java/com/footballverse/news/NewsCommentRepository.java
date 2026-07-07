package com.footballverse.news;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NewsCommentRepository extends JpaRepository<NewsComment, Long> {
    List<NewsComment> findByArticleIdOrderByCreatedAtAsc(Long articleId);
}
