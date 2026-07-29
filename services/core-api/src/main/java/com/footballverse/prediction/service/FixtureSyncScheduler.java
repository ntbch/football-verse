package com.footballverse.prediction.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.prediction.sync-fixtures-enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class FixtureSyncScheduler {

    private final FixtureService fixtureService;

    @Scheduled(fixedDelayString = "${app.prediction.sync-fixtures-delay-ms:60000}")
    public void syncFixtures() {
        try {
            log.info("Starting background fixture synchronization...");
            fixtureService.syncFixtures("premier-league");
            log.info("Background fixture synchronization completed successfully.");
        } catch (Exception e) {
            log.warn("Failed to sync fixtures", e);
        }
    }
}
