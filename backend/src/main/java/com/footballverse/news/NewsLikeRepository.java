package com.footballverse.news;

import com.footballverse.user.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NewsLikeRepository extends JpaRepository<NewsLike, Long> {
    long countByArticleId(Long articleId);

    Optional<NewsLike> findByArticleAndUser(NewsArticle article, UserAccount user);
}
