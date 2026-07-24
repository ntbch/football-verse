package com.footballverse.prediction.model;

import com.footballverse.user.model.UserAccount;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "prediction_score_logs")
@Getter
@Setter
public class PredictionScoreLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prediction_id", nullable = false)
    private UserPrediction prediction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fixture_id", nullable = false)
    private Fixture fixture;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    private int points;

    @Column(name = "outcome_points")
    private int outcomePoints;

    @Column(name = "exact_score_points")
    private int exactScorePoints;

    @Column(name = "ou25_points")
    private int ou25Points;

    @Column(name = "btts_points")
    private int bttsPoints;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "scored_at")
    private Instant scoredAt;
}
