package com.footballverse.prediction.repository;

import com.footballverse.prediction.model.PredictionScoreLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PredictionScoreLogRepository extends JpaRepository<PredictionScoreLog, Long> {
    List<PredictionScoreLog> findByUserIdOrderByScoredAtDesc(Long userId);

    Optional<PredictionScoreLog> findFirstByUserIdAndFixtureIdOrderByScoredAtDesc(Long userId, Long fixtureId);
    List<PredictionScoreLog> findByFixtureId(Long fixtureId);
}
