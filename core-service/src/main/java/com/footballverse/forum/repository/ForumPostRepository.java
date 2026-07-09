package com.footballverse.forum.repository;
import com.footballverse.forum.model.ForumPost;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ForumPostRepository extends JpaRepository<ForumPost, Long> {
    List<ForumPost> findByThreadIdAndHiddenFalseOrderByCreatedAtAsc(Long threadId);

    long countByThreadIdAndHiddenFalse(Long threadId);

    long countByHiddenTrue();
}
