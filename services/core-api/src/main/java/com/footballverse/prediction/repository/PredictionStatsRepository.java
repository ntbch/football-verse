package com.footballverse.prediction.repository;
import com.footballverse.prediction.model.PredictionStats;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PredictionStatsRepository extends JpaRepository<PredictionStats, Long> {
    Optional<PredictionStats> findByUserId(Long userId);
    List<PredictionStats> findAllByOrderByTotalPointsDesc();

    @EntityGraph(attributePaths = "user")
    Page<PredictionStats> findAllByOrderByTotalPointsDescUserIdAsc(Pageable pageable);

    @EntityGraph(attributePaths = "user")
    List<PredictionStats> findByUserIdIn(Collection<Long> userIds);

    @Query("""
            select count(stats) from PredictionStats stats
            where stats.totalPoints > :points
               or (stats.totalPoints = :points and stats.user.id < :userId)
            """)
    long countRankedAhead(@Param("points") int points, @Param("userId") Long userId);
}
