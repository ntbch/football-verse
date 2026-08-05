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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "premium_memberships", uniqueConstraints = {
        @UniqueConstraint(name = "uk_premium_memberships_user", columnNames = "user_id")
})
@Getter
@NoArgsConstructor
public class PremiumMembership extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PremiumMembershipStatus status;

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom;

    @Column(name = "valid_until", nullable = false)
    private Instant validUntil;

    @Version
    private long version;

    public PremiumMembership(UserAccount user, Instant validFrom, Instant validUntil) {
        this.user = user;
        this.status = PremiumMembershipStatus.ACTIVE;
        this.validFrom = validFrom;
        this.validUntil = validUntil;
    }

    public boolean isActiveAt(Instant now) {
        return status == PremiumMembershipStatus.ACTIVE && validUntil.isAfter(now);
    }

    public Instant grant(int durationDays, Instant now) {
        Instant start = isActiveAt(now) ? validUntil : now;
        if (!isActiveAt(now)) validFrom = now;
        validUntil = start.plusSeconds(durationDays * 86_400L);
        status = PremiumMembershipStatus.ACTIVE;
        return validUntil;
    }

    public void expireIfNeeded(Instant now) {
        if (status == PremiumMembershipStatus.ACTIVE && !validUntil.isAfter(now)) status = PremiumMembershipStatus.EXPIRED;
    }
}
