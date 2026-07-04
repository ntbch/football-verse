package com.footballverse.forum;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ForumThreadRepository extends JpaRepository<ForumThread, Long> {
    Page<ForumThread> findByCategorySlugAndHiddenFalseOrderByPinnedDescCreatedAtDesc(String slug, Pageable pageable);

    Optional<ForumThread> findBySlugAndHiddenFalse(String slug);

    long countByHiddenTrue();
}
