package com.footballverse.forum.repository;
import com.footballverse.forum.model.ForumPostLike;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

public interface ForumPostLikeRepository extends JpaRepository<ForumPostLike, Long> {
    boolean existsByPostIdAndUserId(Long postId, Long userId);
    long countByPostId(Long postId);
    @Query("select count(l) from ForumPostLike l where l.post.thread.id = :threadId and l.post.hidden = false")
    long countByThreadId(Long threadId);
    void deleteByPostIdAndUserId(Long postId, Long userId);
    Optional<ForumPostLike> findByPostIdAndUserId(Long postId, Long userId);
}
