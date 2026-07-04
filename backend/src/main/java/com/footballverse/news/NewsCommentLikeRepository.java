package com.footballverse.news;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface NewsCommentLikeRepository extends JpaRepository<NewsCommentLike, Long> {
    boolean existsByCommentIdAndUserId(Long commentId, Long userId);
    long countByCommentId(Long commentId);
    void deleteByCommentIdAndUserId(Long commentId, Long userId);
    Optional<NewsCommentLike> findByCommentIdAndUserId(Long commentId, Long userId);
}
