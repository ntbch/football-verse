package com.footballverse.billing.dto;

public record QrPaymentResponse(
        String bankCode,
        String accountNumber,
        String accountName,
        long amountVnd,
        String transferContent,
        String imageUrl
) {}
