package com.footballverse.forum;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ForumCategoryRepository extends JpaRepository<ForumCategory, Long> {
    Optional<ForumCategory> findBySlug(String slug);
}
