package com.footballverse.forum;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ForumPostRepository extends JpaRepository<ForumPost, Long> {
    List<ForumPost> findByThreadIdAndHiddenFalseOrderByCreatedAtAsc(Long threadId);
}
