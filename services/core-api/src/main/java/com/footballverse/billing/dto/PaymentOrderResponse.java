package com.footballverse.billing.dto;

import com.footballverse.billing.model.PaymentOrderStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PaymentOrderResponse(
        UUID id,
        String invoiceNumber,
        String planCode,
        long amountVnd,
        int durationDays,
        String currency,
        PaymentOrderStatus status,
        Instant expiresAt,
        Instant paidAt,
        Instant createdAt,
        String checkoutUrl,
        List<CheckoutField> checkoutFields,
        QrPaymentResponse qrPayment
) {}
