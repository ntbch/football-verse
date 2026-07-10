package com.footballverse.forum.repository;
import com.footballverse.forum.model.ForumCategory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ForumCategoryRepository extends JpaRepository<ForumCategory, Long> {
    Optional<ForumCategory> findBySlug(String slug);
}
