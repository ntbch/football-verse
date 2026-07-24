package com.footballverse.forum.repository;
import com.footballverse.forum.model.ForumThread;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ForumThreadRepository extends JpaRepository<ForumThread, Long> {
    Page<ForumThread> findByCategorySlugAndHiddenFalseOrderByPinnedDescCreatedAtDesc(String slug, Pageable pageable);

    Page<ForumThread> findByCategorySlugAndHiddenFalseOrderByPinnedDescLastActivityAtDesc(String slug, Pageable pageable);

    @Query(value = """
            SELECT t.* FROM forum_threads t
            JOIN forum_categories c ON c.id = t.category_id
            LEFT JOIN forum_posts p ON p.thread_id = t.id AND p.hidden = false
            LEFT JOIN forum_post_likes l ON l.post_id = p.id
            WHERE c.slug = :slug AND t.hidden = false
            GROUP BY t.id
            ORDER BY t.pinned DESC, (COUNT(DISTINCT p.id) + COUNT(l.id)) DESC, t.last_activity_at DESC
            """,
            countQuery = """
            SELECT COUNT(*) FROM forum_threads t
            JOIN forum_categories c ON c.id = t.category_id
            WHERE c.slug = :slug AND t.hidden = false
            """,
            nativeQuery = true)
    Page<ForumThread> topThreads(String slug, Pageable pageable);

    @Query(value = """
            SELECT t.* FROM forum_threads t
            JOIN forum_categories c ON c.id = t.category_id
            LEFT JOIN forum_posts p ON p.thread_id = t.id AND p.hidden = false
            LEFT JOIN forum_post_likes l ON l.post_id = p.id
            WHERE c.slug = :slug AND t.hidden = false
            GROUP BY t.id
            ORDER BY t.pinned DESC, (COUNT(DISTINCT p.id) + COUNT(l.id)) DESC, t.last_activity_at DESC
            """,
            countQuery = """
            SELECT COUNT(*) FROM forum_threads t
            JOIN forum_categories c ON c.id = t.category_id
            WHERE c.slug = :slug AND t.hidden = false
            """,
            nativeQuery = true)
    Page<ForumThread> hotThreads(String slug, Pageable pageable);

    @Query(value = "SELECT DISTINCT t.* FROM forum_threads t " +
            "LEFT JOIN forum_posts p ON p.thread_id = t.id " +
            "WHERE t.hidden = false AND (p.id IS NULL OR p.hidden = false) AND (" +
            "LOWER(t.title) LIKE LOWER(CONCAT('%', :query, '%'))" +
            " OR LOWER(p.content) LIKE LOWER(CONCAT('%', :query, '%'))" +
            ")",
            countQuery = "SELECT COUNT(DISTINCT t.id) FROM forum_threads t " +
            "LEFT JOIN forum_posts p ON p.thread_id = t.id " +
            "WHERE t.hidden = false AND (p.id IS NULL OR p.hidden = false) AND (" +
            "LOWER(t.title) LIKE LOWER(CONCAT('%', :query, '%'))" +
            " OR LOWER(p.content) LIKE LOWER(CONCAT('%', :query, '%'))" +
            ")",
            nativeQuery = true)
    Page<ForumThread> searchThreads(String query, Pageable pageable);

    Optional<ForumThread> findBySlugAndHiddenFalse(String slug);

    long countByHiddenTrue();
}
