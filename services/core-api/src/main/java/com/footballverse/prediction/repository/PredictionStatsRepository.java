package com.footballverse.prediction.repository;
import com.footballverse.prediction.model.PredictionStats;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PredictionStatsRepository extends JpaRepository<PredictionStats, Long> {
    Optional<PredictionStats> findByUserId(Long userId);
    List<PredictionStats> findAllByOrderByTotalPointsDesc();

    @EntityGraph(attributePaths = "user")
    List<PredictionStats> findAllByOrderByTotalPointsDesc(Pageable pageable);

    @EntityGraph(attributePaths = "user")
    List<PredictionStats> findByUserIdIn(Collection<Long> userIds);
}
