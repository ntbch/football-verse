package com.footballverse.billing.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BillingScheduler {
    private final BillingService billingService;

    @Scheduled(fixedDelayString = "${app.billing.expiry-poll-ms:300000}")
    public void expirePendingOrders() {
        billingService.expirePendingOrders();
    }
}
