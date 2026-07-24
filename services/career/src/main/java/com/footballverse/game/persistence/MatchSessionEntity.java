package com.footballverse.game.persistence;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "match_sessions", uniqueConstraints = @UniqueConstraint(columnNames = {"owner_user_id", "request_id"}))
public class MatchSessionEntity {
    @Id private UUID id;
    @Column(nullable = false) private UUID careerSaveId;
    @Column(nullable = false) private UUID fixtureId;
    @Column(nullable = false) private Long ownerUserId;
    @Column(nullable = false) private UUID requestId;
    private UUID lastRequestId;
    @Column(nullable = false, length = 20) private String status;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") private String inputSnapshot;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") private String stateSnapshot;
    private UUID matchId;
    @Version private long version;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;

    protected MatchSessionEntity() {}

    public MatchSessionEntity(UUID careerSaveId, UUID fixtureId, Long ownerUserId, UUID requestId,
                              String inputSnapshot, String stateSnapshot) {
        this.id = UUID.randomUUID();
        this.careerSaveId = careerSaveId;
        this.fixtureId = fixtureId;
        this.ownerUserId = ownerUserId;
        this.requestId = requestId;
        this.status = "ACTIVE";
        this.inputSnapshot = inputSnapshot;
        this.stateSnapshot = stateSnapshot;
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getCareerSaveId() { return careerSaveId; }
    public UUID getFixtureId() { return fixtureId; }
    public Long getOwnerUserId() { return ownerUserId; }
    public UUID getRequestId() { return requestId; }
    public UUID getLastRequestId() { return lastRequestId; }
    public String getStatus() { return status; }
    public String getInputSnapshot() { return inputSnapshot; }
    public String getStateSnapshot() { return stateSnapshot; }
    public UUID getMatchId() { return matchId; }
    public long getVersion() { return version; }

    public void advance(UUID requestId, String stateSnapshot) {
        requireActive();
        this.lastRequestId = requestId;
        this.stateSnapshot = stateSnapshot;
        this.updatedAt = Instant.now();
    }

    public void finish(UUID requestId, UUID matchId, String stateSnapshot) {
        requireActive();
        this.lastRequestId = requestId;
        this.matchId = matchId;
        this.stateSnapshot = stateSnapshot;
        this.status = "COMPLETED";
        this.updatedAt = Instant.now();
    }

    public void abandon(UUID requestId) {
        requireActive();
        this.lastRequestId = requestId;
        this.status = "ABANDONED";
        this.updatedAt = Instant.now();
    }

    private void requireActive() {
        if (!"ACTIVE".equals(status)) throw new IllegalStateException("Match session is not active");
    }
}
