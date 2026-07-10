package com.footballverse.news.repository;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsBookmark;

import com.footballverse.user.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NewsBookmarkRepository extends JpaRepository<NewsBookmark, Long> {
    long countByArticleId(Long articleId);

    Optional<NewsBookmark> findByArticleAndUser(NewsArticle article, UserAccount user);
}
