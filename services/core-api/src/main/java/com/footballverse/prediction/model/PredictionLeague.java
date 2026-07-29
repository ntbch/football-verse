package com.footballverse.prediction.model;

import com.footballverse.common.AuditableEntity;
import com.footballverse.user.model.UserAccount;
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

@Entity
@Table(name = "prediction_leagues")
@Getter
@NoArgsConstructor
public class PredictionLeague extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "owner_id", nullable = false) private UserAccount owner;
    @Column(nullable = false, length = 80) private String name;
    @Column(name = "invite_code", nullable = false, unique = true, length = 8) private String inviteCode;

    public PredictionLeague(UserAccount owner, String name, String inviteCode) { this.owner = owner; this.name = name; this.inviteCode = inviteCode; }
}
