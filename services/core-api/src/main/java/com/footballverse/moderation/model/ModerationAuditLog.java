package com.footballverse.moderation.model;

import com.footballverse.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "moderation_audit_logs")
@Getter
@Setter
@NoArgsConstructor
public class ModerationAuditLog extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(nullable = false, length = 80)
    private String action;

    @Column(name = "target_type", nullable = false, length = 40)
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(length = 300)
    private String reason;

    public ModerationAuditLog(Long actorId, String action, String targetType, Long targetId, String reason) {
        this.actorId = actorId;
        this.action = action;
        this.targetType = targetType;
        this.targetId = targetId;
        this.reason = reason;
    }
}
