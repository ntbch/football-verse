package com.footballverse.news;

import com.footballverse.user.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NewsBookmarkRepository extends JpaRepository<NewsBookmark, Long> {
    long countByArticleId(Long articleId);

    Optional<NewsBookmark> findByArticleAndUser(NewsArticle article, UserAccount user);
}
