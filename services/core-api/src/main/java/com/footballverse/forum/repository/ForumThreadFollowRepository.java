package com.footballverse.forum.repository;
import com.footballverse.forum.model.ForumThreadFollow;

import com.footballverse.user.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ForumThreadFollowRepository extends JpaRepository<ForumThreadFollow, Long> {
    boolean existsByThreadIdAndUserId(Long threadId, Long userId);

    Optional<ForumThreadFollow> findByThreadIdAndUserId(Long threadId, Long userId);

    List<ForumThreadFollow> findByThreadId(Long threadId);

    List<ForumThreadFollow> findByUserOrderByThreadLastActivityAtDesc(UserAccount user);

    @Query("select f.thread.id from ForumThreadFollow f where f.user.id = :userId and f.thread.id in :threadIds")
    List<Long> findFollowedThreadIds(@Param("userId") Long userId, @Param("threadIds") Collection<Long> threadIds);
}
