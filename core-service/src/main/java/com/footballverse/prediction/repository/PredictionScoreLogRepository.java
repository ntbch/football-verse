package com.footballverse.prediction.repository;

import com.footballverse.prediction.model.PredictionScoreLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PredictionScoreLogRepository extends JpaRepository<PredictionScoreLog, Long> {
    List<PredictionScoreLog> findByUserIdOrderByScoredAtDesc(Long userId);
}
