package com.footballverse.prediction;

import com.footballverse.common.AuditableEntity;
import com.footballverse.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_predictions")
@Getter
@Setter
@NoArgsConstructor
public class UserPrediction extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Fixture fixture;

    @Column(nullable = false, length = 10)
    private String pick;

    @Column(name = "home_score")
    private Integer homeScore;

    @Column(name = "away_score")
    private Integer awayScore;

    @Column(nullable = false)
    private int points = 0;

    @Column(nullable = false)
    private boolean correct = false;

    @Column(name = "correct_outcome")
    private Boolean correctOutcome;

    @Column(name = "correct_exact_score")
    private Boolean correctExactScore;

    @Column(name = "correct_ou25")
    private Boolean correctOu25;

    @Column(name = "correct_btts")
    private Boolean correctBtts;

    @Column(name = "pick_ou25", length = 10)
    private String pickOu25;

    @Column(name = "pick_btts", length = 10)
    private String pickBtts;
}
