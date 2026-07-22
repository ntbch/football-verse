package com.footballverse.game.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "match_session_requests")
public class MatchSessionRequestEntity {
    @Id private UUID requestId;
    @Column(nullable = false) private UUID sessionId;
    @Column(nullable = false) private UUID careerSaveId;
    @Column(nullable = false) private Long ownerUserId;
    @Column(nullable = false, length = 20) private String action;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") private String responseSnapshot;
    @Column(nullable = false, updatable = false) private Instant createdAt;

    protected MatchSessionRequestEntity() {}

    public MatchSessionRequestEntity(UUID requestId, UUID sessionId, UUID careerSaveId, Long ownerUserId,
                                     String action, String responseSnapshot) {
        this.requestId = requestId;
        this.sessionId = sessionId;
        this.careerSaveId = careerSaveId;
        this.ownerUserId = ownerUserId;
        this.action = action;
        this.responseSnapshot = responseSnapshot;
        this.createdAt = Instant.now();
    }

    public UUID getSessionId() { return sessionId; }
    public UUID getCareerSaveId() { return careerSaveId; }
    public String getAction() { return action; }
    public String getResponseSnapshot() { return responseSnapshot; }
}
