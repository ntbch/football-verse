package com.footballverse.forum;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ForumReportRepository extends JpaRepository<ForumReport, Long> {
    List<ForumReport> findByStatusOrderByCreatedAtDesc(ForumReportStatus status);
}
