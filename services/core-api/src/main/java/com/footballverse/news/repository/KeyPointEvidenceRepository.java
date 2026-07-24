package com.footballverse.news.repository;

import com.footballverse.news.model.KeyPointEvidence;
import com.footballverse.news.model.KeyPointEvidenceId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface KeyPointEvidenceRepository extends JpaRepository<KeyPointEvidence, KeyPointEvidenceId> {
    void deleteByKeyPointId(Long keyPointId);

    @Query("""
            select evidence from KeyPointEvidence evidence
            join fetch evidence.rawItem raw
            left join fetch raw.publisher
            join fetch raw.connector
            where evidence.keyPoint.id = :keyPointId
            order by raw.publishedAt asc, raw.id asc
            """)
    List<KeyPointEvidence> findWithSourcesByKeyPointId(@Param("keyPointId") Long keyPointId);
}
