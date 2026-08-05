package com.footballverse.forum.repository;
import com.footballverse.forum.model.ForumPost;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ForumPostRepository extends JpaRepository<ForumPost, Long> {
    List<ForumPost> findByThreadIdAndHiddenFalseOrderByCreatedAtAsc(Long threadId);

    long countByThreadIdAndHiddenFalse(Long threadId);

    long countByHiddenTrue();

    @Query("select p.thread.id, count(p) from ForumPost p where p.thread.id in :threadIds and p.hidden = false group by p.thread.id")
    List<Object[]> countVisibleByThreadIds(@Param("threadIds") Collection<Long> threadIds);
}
