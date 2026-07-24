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
@Table(name = "career_operation_requests")
public class CareerOperationRequestEntity {
    @Id private UUID requestId;
    @Column(nullable = false) private UUID careerSaveId;
    @Column(nullable = false) private Long ownerUserId;
    @Column(nullable = false, length = 64) private String action;
    @Column(nullable = false, length = 16) private String state;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") private String responseSnapshot;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;

    protected CareerOperationRequestEntity() {}

    public CareerOperationRequestEntity(UUID requestId, UUID careerSaveId, Long ownerUserId, String action) {
        this.requestId = requestId;
        this.careerSaveId = careerSaveId;
        this.ownerUserId = ownerUserId;
        this.action = action;
        this.state = "PENDING";
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
    }

    public UUID getRequestId() { return requestId; }
    public UUID getCareerSaveId() { return careerSaveId; }
    public Long getOwnerUserId() { return ownerUserId; }
    public String getAction() { return action; }
    public String getState() { return state; }
    public String getResponseSnapshot() { return responseSnapshot; }

    public void complete(String responseSnapshot) {
        this.responseSnapshot = responseSnapshot;
        this.state = "COMPLETED";
        this.updatedAt = Instant.now();
    }
}
