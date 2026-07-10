package com.footballverse.forum.repository;
import com.footballverse.forum.model.ForumThreadFollow;

import com.footballverse.user.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ForumThreadFollowRepository extends JpaRepository<ForumThreadFollow, Long> {
    boolean existsByThreadIdAndUserId(Long threadId, Long userId);

    Optional<ForumThreadFollow> findByThreadIdAndUserId(Long threadId, Long userId);

    List<ForumThreadFollow> findByThreadId(Long threadId);

    List<ForumThreadFollow> findByUserOrderByThreadLastActivityAtDesc(UserAccount user);
}
