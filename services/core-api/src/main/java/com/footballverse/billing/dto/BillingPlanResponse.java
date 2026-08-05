package com.footballverse.billing.dto;

public record BillingPlanResponse(
        String code,
        String name,
        int durationDays,
        long amountVnd,
        String currency,
        boolean purchasable
) {}
