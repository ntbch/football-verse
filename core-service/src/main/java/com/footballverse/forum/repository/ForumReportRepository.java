package com.footballverse.forum.repository;
import com.footballverse.forum.model.ForumReport;
import com.footballverse.forum.model.ForumReportStatus;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ForumReportRepository extends JpaRepository<ForumReport, Long> {
    List<ForumReport> findByStatusOrderByCreatedAtDesc(ForumReportStatus status);

    long countByStatus(ForumReportStatus status);
}
