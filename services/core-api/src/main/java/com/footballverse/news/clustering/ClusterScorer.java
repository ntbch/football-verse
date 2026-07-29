package com.footballverse.news.clustering;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;

@Component
public class ClusterScorer {

    public double calculateHybridScore(
            double semanticScore,
            double lexicalScore,
            double entityScore,
            Instant itemTime,
            Instant candidateTime
    ) {
        double timeScore = calculateTimeDecay(itemTime, candidateTime);
        double finalScore = (semanticScore * 0.75) + (lexicalScore * 0.10) + (entityScore * 0.10) + (timeScore * 0.05);
        return Math.min(1.0, Math.max(0.0, finalScore));
    }

    public double calculateTimeDecay(Instant t1, Instant t2) {
        if (t1 == null || t2 == null) return 1.0;
        long hours = Math.abs(Duration.between(t1, t2).toHours());
        if (hours <= 2) return 1.0;
        if (hours <= 12) return 0.9;
        if (hours <= 24) return 0.75;
        if (hours <= 48) return 0.5;
        return 0.2;
    }

    public BigDecimal toBigDecimal(double value) {
        return BigDecimal.valueOf(value).setScale(5, RoundingMode.HALF_UP);
    }
}
