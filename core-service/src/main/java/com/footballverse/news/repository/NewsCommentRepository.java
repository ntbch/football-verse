package com.footballverse.news.repository;
import com.footballverse.news.model.NewsComment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NewsCommentRepository extends JpaRepository<NewsComment, Long> {
    List<NewsComment> findByArticleIdOrderByCreatedAtAsc(Long articleId);
}
