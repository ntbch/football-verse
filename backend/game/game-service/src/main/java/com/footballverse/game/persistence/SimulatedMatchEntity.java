package com.footballverse.game.persistence;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "matches", uniqueConstraints = @UniqueConstraint(columnNames = {"owner_user_id", "idempotency_key"}))
public class SimulatedMatchEntity {
    @Id private UUID id;
    @Column(nullable = false) private UUID careerSaveId;
    @Column(nullable = false, unique = true) private UUID fixtureId;
    @Column(nullable = false) private Long ownerUserId;
    @Column(nullable = false, length = 100) private String idempotencyKey;
    @Column(nullable = false, length = 30) private String status;
    @Column(nullable = false) private long seed;
    @Column(nullable = false, length = 30) private String engineVersion;
    @Column(nullable = false, length = 30) private String rulesetVersion;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") private String inputSnapshot;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") private String resultSnapshot;
    private Integer homeScore;
    private Integer awayScore;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    private Instant completedAt;

    protected SimulatedMatchEntity() {}
    public SimulatedMatchEntity(UUID careerSaveId, UUID fixtureId, Long ownerUserId, String idempotencyKey,
                                long seed, String engineVersion, String rulesetVersion, String inputSnapshot) {
        this.id = UUID.randomUUID(); this.careerSaveId = careerSaveId; this.fixtureId = fixtureId;
        this.ownerUserId = ownerUserId; this.idempotencyKey = idempotencyKey; this.status = "CREATED";
        this.seed = seed; this.engineVersion = engineVersion; this.rulesetVersion = rulesetVersion;
        this.inputSnapshot = inputSnapshot; this.createdAt = Instant.now();
    }
    public UUID getId() { return id; }
    public String getInputSnapshot() { return inputSnapshot; }
    public String getResultSnapshot() { return resultSnapshot; }
    public UUID getCareerSaveId() { return careerSaveId; }
    public UUID getFixtureId() { return fixtureId; }
    public Long getOwnerUserId() { return ownerUserId; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public String getStatus() { return status; }
    public Integer getHomeScore() { return homeScore; }
    public Integer getAwayScore() { return awayScore; }

    public void complete(String resultSnapshot, int homeScore, int awayScore) {
        if (!"CREATED".equals(status)) {
            throw new IllegalStateException("Match is already completed");
        }
        this.resultSnapshot = resultSnapshot;
        this.homeScore = homeScore;
        this.awayScore = awayScore;
        this.status = "COMPLETED";
        this.completedAt = Instant.now();
    }
}
