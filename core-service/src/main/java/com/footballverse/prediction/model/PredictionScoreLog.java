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
    private int outcomePoints;
    private int exactScorePoints;
    private int ou25Points;
    private int bttsPoints;

    @Column(columnDefinition = "TEXT")
    private String reason;

    private Instant scoredAt;
}
