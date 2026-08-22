package com.footballverse.billing.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class BillingScheduler {
    private final BillingService billingService;

    @Scheduled(fixedDelayString = "${app.billing.expiry-poll-ms:300000}")
    public void expirePendingOrders() {
        try {
            billingService.expirePendingOrders();
        } catch (Exception e) {
            // One failing poll must not depend on the framework's default
            // scheduler logging; surface a compact warning instead.
            log.warn("Billing expiry poll failed: {}", e.getMessage());
            log.debug("Billing expiry poll failure detail", e);
        }
    }
}
