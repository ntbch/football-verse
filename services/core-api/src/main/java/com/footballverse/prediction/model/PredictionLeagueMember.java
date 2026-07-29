package com.footballverse.prediction.model;

import com.footballverse.common.AuditableEntity;
import com.footballverse.user.model.UserAccount;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "prediction_league_members", uniqueConstraints = @UniqueConstraint(name = "uk_prediction_league_member", columnNames = {"league_id", "user_id"}))
@Getter
@NoArgsConstructor
public class PredictionLeagueMember extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "league_id", nullable = false) private PredictionLeague league;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private UserAccount user;

    public PredictionLeagueMember(PredictionLeague league, UserAccount user) { this.league = league; this.user = user; }
}
