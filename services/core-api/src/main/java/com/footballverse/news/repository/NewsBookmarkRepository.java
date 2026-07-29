package com.footballverse.news.repository;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsBookmark;
import com.footballverse.news.model.ArticleStatus;

import com.footballverse.user.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NewsBookmarkRepository extends JpaRepository<NewsBookmark, Long> {
    long countByArticleId(Long articleId);

    Optional<NewsBookmark> findByArticleAndUser(NewsArticle article, UserAccount user);

    @Query("select b.article.id, count(b) from NewsBookmark b where b.article.id in :articleIds group by b.article.id")
    List<Object[]> countByArticleIds(@Param("articleIds") Collection<Long> articleIds);

    @Query("select b.article.id from NewsBookmark b where b.article.id in :articleIds and b.user.id = :userId")
    List<Long> findArticleIdsByArticleIdInAndUserId(@Param("articleIds") Collection<Long> articleIds, @Param("userId") Long userId);

    @Query("select b from NewsBookmark b join fetch b.article where b.user.id = :userId and b.article.status = :status order by b.id desc")
    List<NewsBookmark> findAllWithArticleByUserId(@Param("userId") Long userId, @Param("status") ArticleStatus status);
}
