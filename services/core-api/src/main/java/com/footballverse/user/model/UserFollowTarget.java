package com.footballverse.user.model;

import com.footballverse.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "user_follow_targets", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_follow_targets_user_target", columnNames = {"user_id", "target_type", "target_key"})
})
@Getter
@NoArgsConstructor
public class UserFollowTarget extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private FollowTargetType targetType;

    @Column(name = "target_key", nullable = false, length = 120)
    private String targetKey;

    @Column(name = "target_name", nullable = false, length = 120)
    private String targetName;

    public UserFollowTarget(UserAccount user, FollowTargetType targetType, String targetKey, String targetName) {
        this.user = user;
        this.targetType = targetType;
        this.targetKey = targetKey;
        this.targetName = targetName;
    }
}
