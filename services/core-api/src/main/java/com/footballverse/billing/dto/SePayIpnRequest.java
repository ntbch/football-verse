package com.footballverse.billing.dto;

import java.math.BigDecimal;

public record SePayIpnRequest(
        Long timestamp,
        String notification_type,
        SePayOrder order,
        SePayTransaction transaction
) {
    public record SePayOrder(
            String id,
            String order_id,
            String order_status,
            String order_currency,
            BigDecimal order_amount,
            String order_invoice_number
    ) {}

    public record SePayTransaction(
            String id,
            String transaction_id,
            String payment_method,
            String transaction_type,
            String transaction_status,
            BigDecimal transaction_amount,
            String transaction_currency
    ) {}
}
