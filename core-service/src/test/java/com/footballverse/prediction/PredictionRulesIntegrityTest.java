package com.footballverse.prediction;
import com.footballverse.prediction.model.Fixture;
import com.footballverse.prediction.model.PredictionScoreLog;
import com.footballverse.prediction.repository.FixtureRepository;
import com.footballverse.prediction.repository.PredictionScoreLogRepository;
import com.footballverse.prediction.repository.UserPredictionRepository;
import com.footballverse.prediction.service.ScoringService;
import com.footballverse.prediction.service.UserPredictionService;

import com.footballverse.common.exception.BadRequestException;
import com.footballverse.prediction.dto.PredictionRequest;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "app.crawl.startup-enabled=false"
})
@Transactional
class PredictionRulesIntegrityTest {

    @Autowired private UserPredictionService predictionService;
    @Autowired private ScoringService scoringService;
    @Autowired private FixtureRepository fixtureRepo;
    @Autowired private UserPredictionRepository predictionRepo;
    @Autowired private PredictionScoreLogRepository scoreLogRepo;
    @Autowired private UserAccountRepository userRepo;

    private UserAccount user;
    private Fixture fixture;

    @BeforeEach
    void setUp() {
        user = userRepo.save(new UserAccount(UUID.randomUUID() + "@u.local", "user-" + UUID.randomUUID(), "hash"));
        fixture = new Fixture();
        fixture.setFixtureId("fx-" + UUID.randomUUID());
        fixture.setLeagueSlug("premier-league");
        fixture.setHomeTeam("Home FC");
        fixture.setAwayTeam("Away FC");
        fixture.setKickoff(Instant.now().plusSeconds(3600)); // 1 hour in future
        fixture.setStatus("upcoming");
        fixture = fixtureRepo.save(fixture);
    }

    @Test
    void submitPrediction_validScore_succeeds() {
        PredictionRequest req = new PredictionRequest("home", 2, 1, "over", "yes");
        assertDoesNotThrow(() -> predictionService.submitPrediction(user, fixture.getId(), req));
    }

    @Test
    void submitPrediction_kickoffPassed_throwsPredictionClosed() {
        fixture.setKickoff(Instant.now().minusSeconds(10));
        fixtureRepo.save(fixture);

        PredictionRequest req = new PredictionRequest("home", 2, 1, "over", "yes");
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
            predictionService.submitPrediction(user, fixture.getId(), req)
        );
        assertEquals("PREDICTION_CLOSED", ex.getMessage());
    }

    @Test
    void submitPrediction_statusNotUpcoming_throwsPredictionClosed() {
        fixture.setStatus("live");
        fixtureRepo.save(fixture);

        PredictionRequest req = new PredictionRequest("home", 2, 1, "over", "yes");
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
            predictionService.submitPrediction(user, fixture.getId(), req)
        );
        assertEquals("PREDICTION_CLOSED", ex.getMessage());
    }

    @Test
    void submitPrediction_scoreTooHigh_throwsInvalidScore() {
        PredictionRequest req = new PredictionRequest("home", 21, 1, "over", "yes");
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
            predictionService.submitPrediction(user, fixture.getId(), req)
        );
        assertEquals("Invalid home score", ex.getMessage());
    }

    @Test
    void submitPrediction_scoreTooLow_throwsInvalidScore() {
        PredictionRequest req = new PredictionRequest("home", 2, -1, "over", "yes");
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
            predictionService.submitPrediction(user, fixture.getId(), req)
        );
        assertEquals("Invalid away score", ex.getMessage());
    }

    @Test
    void scoreFixture_savesDetailedAuditLogsAndScoredAt() {
        PredictionRequest req = new PredictionRequest("home", 2, 1, "over", "yes");
        predictionService.submitPrediction(user, fixture.getId(), req);

        // Update fixture status and scores for result sync
        fixture.setStatus("result");
        fixture.setHomeScore(2);
        fixture.setAwayScore(1);
        fixtureRepo.save(fixture);

        scoringService.scoreFixture(fixture.getId());

        Fixture scoredFixture = fixtureRepo.findById(fixture.getId()).orElseThrow();
        assertTrue(scoredFixture.isScored());
        assertNotNull(scoredFixture.getScoredAt());

        List<PredictionScoreLog> logs = scoreLogRepo.findByUserIdOrderByScoredAtDesc(user.getId());
        assertEquals(1, logs.size());
        PredictionScoreLog log = logs.get(0);
        assertEquals(user.getId(), log.getUser().getId());
        assertEquals(fixture.getId(), log.getFixture().getId());
        assertEquals(12, log.getPoints(), "3 outcome + 5 exact + 2 ou2.5 + 2 btts = 12");
        assertEquals(3, log.getOutcomePoints());
        assertEquals(5, log.getExactScorePoints());
        assertEquals(2, log.getOu25Points());
        assertEquals(2, log.getBttsPoints());
    }
}
