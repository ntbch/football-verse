package com.footballverse.billing.dto;

import com.footballverse.billing.model.PremiumMembershipStatus;

import java.time.Instant;

public record MembershipResponse(
        boolean premium,
        PremiumMembershipStatus status,
        Instant validFrom,
        Instant validUntil,
        String renewalMode
) {}
