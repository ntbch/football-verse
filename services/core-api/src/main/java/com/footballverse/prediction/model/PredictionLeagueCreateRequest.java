package com.footballverse.prediction.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "prediction_league_create_requests")
@Getter
public class PredictionLeagueCreateRequest {
    @Id private UUID requestId;
    @Column(nullable = false) private Long ownerId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "league_id") private PredictionLeague league;
    @Column(nullable = false, length = 16) private String state;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;

    protected PredictionLeagueCreateRequest() {}

    public void complete(PredictionLeague league) {
        this.league = league;
        this.state = "COMPLETED";
        this.updatedAt = Instant.now();
    }
}
