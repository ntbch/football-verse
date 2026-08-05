package com.footballverse.billing.model;

import com.footballverse.common.AuditableEntity;
import com.footballverse.user.model.UserAccount;
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

import java.time.Instant;

@Entity
@Table(name = "premium_membership_ledger", uniqueConstraints = {
        @UniqueConstraint(name = "uk_premium_ledger_order_grant", columnNames = {"order_id", "entry_type"})
})
@Getter
@NoArgsConstructor
public class PremiumMembershipLedger extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private PaymentOrder order;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 16)
    private PremiumLedgerEntryType entryType;

    @Column(name = "duration_days", nullable = false)
    private int durationDays;

    @Column(name = "previous_valid_until")
    private Instant previousValidUntil;

    @Column(name = "new_valid_until")
    private Instant newValidUntil;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(length = 300)
    private String reason;

    public PremiumMembershipLedger(UserAccount user, PaymentOrder order, PremiumLedgerEntryType entryType,
                                   int durationDays, Instant previousValidUntil, Instant newValidUntil,
                                   Long actorId, String reason) {
        this.user = user;
        this.order = order;
        this.entryType = entryType;
        this.durationDays = durationDays;
        this.previousValidUntil = previousValidUntil;
        this.newValidUntil = newValidUntil;
        this.actorId = actorId;
        this.reason = reason;
    }
}
