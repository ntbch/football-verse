package com.footballverse.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePaymentOrderRequest(@NotBlank String planCode) {}
