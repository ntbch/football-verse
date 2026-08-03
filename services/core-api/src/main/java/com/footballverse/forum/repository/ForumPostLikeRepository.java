package com.footballverse.forum.repository;
import com.footballverse.forum.model.ForumPostLike;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ForumPostLikeRepository extends JpaRepository<ForumPostLike, Long> {
    boolean existsByPostIdAndUserId(Long postId, Long userId);
    long countByPostId(Long postId);
    @Query("select count(l) from ForumPostLike l where l.post.thread.id = :threadId and l.post.hidden = false")
    long countByThreadId(Long threadId);

    @Query("select l.post.thread.id, count(l) from ForumPostLike l where l.post.thread.id in :threadIds and l.post.hidden = false group by l.post.thread.id")
    List<Object[]> countByThreadIds(@Param("threadIds") Collection<Long> threadIds);
    void deleteByPostIdAndUserId(Long postId, Long userId);
    Optional<ForumPostLike> findByPostIdAndUserId(Long postId, Long userId);
}
