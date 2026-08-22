package com.footballverse.prediction.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@ConditionalOnProperty(name = "app.prediction.sync-fixtures-enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class FixtureSyncScheduler {

    private final FixtureService fixtureService;

    /** Comma-separated league slugs to keep in sync. */
    @Value("${app.prediction.sync-leagues:premier-league}")
    private String syncLeagues;

    private volatile Instant lastFailureLog = Instant.EPOCH;

    @Scheduled(fixedDelayString = "${app.prediction.sync-fixtures-delay-ms:60000}")
    public void syncFixtures() {
        for (String leagueSlug : syncLeagues.split(",")) {
            String league = leagueSlug.trim();
            if (league.isEmpty()) continue;
            try {
                log.info("Starting background fixture synchronization for {}...", league);
                fixtureService.syncFixtures(league);
                log.info("Background fixture synchronization for {} completed successfully.", league);
            } catch (Exception e) {
                // Persistent failures repeat every cycle; log them at most once
                // per 10 minutes and keep the stack trace out of the noise.
                if (lastFailureLog.isBefore(Instant.now().minus(10, ChronoUnit.MINUTES))) {
                    lastFailureLog = Instant.now();
                    log.warn("Failed to sync fixtures for {}: {}", league, e.getMessage());
                }
                log.debug("Fixture synchronization failure detail for {}", league, e);
            }
        }
    }
}
