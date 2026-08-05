package com.footballverse.billing.dto;

public record ReconciliationResponse(
        String localInvoiceNumber,
        String providerOrderId,
        String providerInvoiceNumber,
        String providerOrderStatus,
        Long providerAmountVnd,
        String providerCurrency,
        String providerTransactionStatus,
        String outcome,
        String error
) {}
