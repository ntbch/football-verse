package com.footballverse.news;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NewsTagRepository extends JpaRepository<NewsTag, Long> {
    Optional<NewsTag> findBySlug(String slug);
}
