package com.footballverse.prediction.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
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
