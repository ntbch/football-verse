package com.footballverse.prediction.service;
import com.footballverse.prediction.model.Fixture;
import com.footballverse.prediction.repository.FixtureRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ScoringScheduler {

    private final FixtureRepository fixtureRepo;
    private final ScoringService scoringService;

    /** Poll every 5 minutes for unscored results */
    @Scheduled(fixedRate = 300_000)
    public void autoScoreResults() {
        List<Fixture> unscored = fixtureRepo.findByStatusAndScoredFalse("result");
        if (unscored.isEmpty()) return;
        log.info("Auto-scoring {} fixtures", unscored.size());
        for (Fixture f : unscored) {
            try {
                scoringService.scoreFixture(f.getId());
            } catch (Exception e) {
                log.warn("Failed to score fixture {}: {}", f.getId(), e.getMessage());
            }
        }
    }
}