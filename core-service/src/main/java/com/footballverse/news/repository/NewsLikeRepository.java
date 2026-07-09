package com.footballverse.news.repository;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsLike;

import com.footballverse.user.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NewsLikeRepository extends JpaRepository<NewsLike, Long> {
    long countByArticleId(Long articleId);

    Optional<NewsLike> findByArticleAndUser(NewsArticle article, UserAccount user);
}
