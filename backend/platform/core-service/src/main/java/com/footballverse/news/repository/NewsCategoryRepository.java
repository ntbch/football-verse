package com.footballverse.news.repository;
import com.footballverse.news.model.NewsCategory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NewsCategoryRepository extends JpaRepository<NewsCategory, Long> {
    Optional<NewsCategory> findBySlug(String slug);
}
