package com.footballverse.news.repository;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsLike;

import com.footballverse.user.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NewsLikeRepository extends JpaRepository<NewsLike, Long> {
    long countByArticleId(Long articleId);

    Optional<NewsLike> findByArticleAndUser(NewsArticle article, UserAccount user);

    @Query("select l.article.id, count(l) from NewsLike l where l.article.id in :articleIds group by l.article.id")
    List<Object[]> countByArticleIds(@Param("articleIds") Collection<Long> articleIds);

    @Query("select l.article.id from NewsLike l where l.article.id in :articleIds and l.user.id = :userId")
    List<Long> findArticleIdsByArticleIdInAndUserId(@Param("articleIds") Collection<Long> articleIds, @Param("userId") Long userId);
}
