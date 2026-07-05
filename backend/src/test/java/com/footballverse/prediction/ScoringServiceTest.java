package com.footballverse.prediction;

import com.footballverse.prediction.dto.LeaderboardEntryResponse;
import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
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
class ScoringServiceTest {

    @Autowired private ScoringService scoringService;
    @Autowired private FixtureRepository fixtureRepo;
    @Autowired private UserPredictionRepository predictionRepo;
    @Autowired private PredictionStatsRepository statsRepo;
    @Autowired private UserBadgeRepository badgeRepo;
    @Autowired private UserAccountRepository userRepo;

    private UserAccount user;
    private Fixture fixture;

    @BeforeEach
    void setUp() {
        user = userRepo.save(new UserAccount(UUID.randomUUID() + "@u.local", "scorer-" + UUID.randomUUID(), "hash"));
        fixture = new Fixture();
        fixture.setFixtureId("fx-" + UUID.randomUUID());
        fixture.setLeagueSlug("premier-league");
        fixture.setHomeTeam("Home FC");
        fixture.setAwayTeam("Away FC");
        fixture.setKickoff(Instant.now().minusSeconds(7200));
        fixture.setStatus("result");
        fixture = fixtureRepo.save(fixture);
    }

    @Test
    void scoreExactMatch_awardsOutcomeAndExactScorePoints() {
        fixture.setHomeScore(2);
        fixture.setAwayScore(1);
        fixture = fixtureRepo.save(fixture);

        UserPrediction pred = newPrediction("home", 2, 1);
        predictionRepo.save(pred);

        scoringService.scoreFixture(fixture.getId());

        UserPrediction scored = predictionRepo.findByUserIdAndFixtureId(user.getId(), fixture.getId()).orElseThrow();
        assertEquals(8, scored.getPoints(), "3 outcome + 5 exact");
        assertTrue(scored.isCorrect());
        assertTrue(scored.getCorrectOutcome());
        assertTrue(scored.getCorrectExactScore());
    }

    @Test
    void wrongOutcome_noStreakButOu25MayStillHit() {
        fixture.setHomeScore(0);
        fixture.setAwayScore(3);
        fixture = fixtureRepo.save(fixture);

        UserPrediction pred = newPrediction("home", 1, 0);
        pred.setPickOu25("over"); // total 3 > 2.5 → over correct, +2
        predictionRepo.save(pred);

        scoringService.scoreFixture(fixture.getId());

        UserPrediction scored = predictionRepo.findByUserIdAndFixtureId(user.getId(), fixture.getId()).orElseThrow();
        assertEquals(2, scored.getPoints(), "only ou25 bonus");
        assertFalse(scored.getCorrectOutcome());
        assertTrue(scored.getCorrectOu25());

        PredictionStats stats = statsRepo.findByUserId(user.getId()).orElseThrow();
        assertEquals(0, stats.getCurrentStreak(), "wrong outcome resets streak");
        assertEquals(0, stats.getCorrectPicks(), "correctPicks counts outcome/score only");
    }

    @Test
    void scoreMarkets_bonusPointsAccumulate() {
        fixture.setHomeScore(2);
        fixture.setAwayScore(2);
        fixture = fixtureRepo.save(fixture);

        UserPrediction pred = newPrediction("draw", 2, 2);
        pred.setPickOu25("over"); // total 4 > 2.5
        pred.setPickBtts("yes");
        predictionRepo.save(pred);

        scoringService.scoreFixture(fixture.getId());

        UserPrediction scored = predictionRepo.findByUserIdAndFixtureId(user.getId(), fixture.getId()).orElseThrow();
        assertEquals(12, scored.getPoints(), "3 + 5 + 2 + 2");
        assertTrue(scored.getCorrectOu25());
        assertTrue(scored.getCorrectBtts());
    }

    @Test
    void streak_threeCorrect_awardsFirstPickBadgeOnly() {
        for (int i = 0; i < 3; i++) {
            scoreWinningFixture(i);
        }

        List<UserBadge> badges = badgeRepo.findByUserId(user.getId());
        assertTrue(badges.stream().anyMatch(b -> b.getBadgeCode().equals("first_pick")));
        assertFalse(badges.stream().anyMatch(b -> b.getBadgeCode().equals("streak_5")));

        PredictionStats stats = statsRepo.findByUserId(user.getId()).orElseThrow();
        assertEquals(3, stats.getCurrentStreak());
        assertEquals(3, stats.getCorrectPicks());
    }

    @Test
    void streak_fiveCorrect_awardsStreak5Badge() {
        for (int i = 0; i < 5; i++) {
            scoreWinningFixture(i);
        }
        List<UserBadge> badges = badgeRepo.findByUserId(user.getId());
        assertTrue(badges.stream().anyMatch(b -> b.getBadgeCode().equals("streak_5")));
    }

    @Test
    void scoreFixture_idempotent_secondCallNoOp() {
        fixture.setHomeScore(1);
        fixture.setAwayScore(0);
        fixture = fixtureRepo.save(fixture);
        UserPrediction pred = newPrediction("home", 1, 0);
        predictionRepo.save(pred);

        scoringService.scoreFixture(fixture.getId());
        int pointsAfterFirst = predictionRepo.findByUserIdAndFixtureId(user.getId(), fixture.getId()).orElseThrow().getPoints();
        PredictionStats statsFirst = statsRepo.findByUserId(user.getId()).orElseThrow();
        int picksFirst = statsFirst.getTotalPicks();

        scoringService.scoreFixture(fixture.getId());
        int pointsAfterSecond = predictionRepo.findByUserIdAndFixtureId(user.getId(), fixture.getId()).orElseThrow().getPoints();
        PredictionStats statsSecond = statsRepo.findByUserId(user.getId()).orElseThrow();
        int picksSecond = statsSecond.getTotalPicks();

        assertEquals(pointsAfterFirst, pointsAfterSecond, "no double points");
        assertEquals(picksFirst, picksSecond, "no double totalPicks");
    }

    @Test
    void leaderboard_weekly_includesRecentScorableUsers() {
        scoreWinningFixture(0);

        List<LeaderboardEntryResponse> weekly = scoringService.leaderboard("weekly");
        assertFalse(weekly.isEmpty(), "weekly leaderboard should contain recent scorer");
        LeaderboardEntryResponse top = weekly.get(0);
        assertTrue(top.points() >= 8, "8 points from exact-score win");
    }

    @Test
    void leaderboard_all_returnsAllStatsRows() {
        scoreWinningFixture(0);

        List<LeaderboardEntryResponse> all = scoringService.leaderboard("all");
        assertFalse(all.isEmpty());
    }

    private void scoreWinningFixture(int seed) {
        Fixture f = new Fixture();
        f.setFixtureId("fx-" + seed + "-" + UUID.randomUUID());
        f.setLeagueSlug("premier-league");
        f.setHomeTeam("Home FC");
        f.setAwayTeam("Away FC");
        f.setKickoff(Instant.now().minusSeconds(3600 + seed * 60));
        f.setStatus("result");
        f.setHomeScore(1);
        f.setAwayScore(0);
        f = fixtureRepo.save(f);

        UserPrediction pred = newPrediction("home", 1, 0, f);
        predictionRepo.save(pred);
        scoringService.scoreFixture(f.getId());
    }

    private UserPrediction newPrediction(String pick, int home, int away) {
        return newPrediction(pick, home, away, fixture);
    }

    private UserPrediction newPrediction(String pick, int home, int away, Fixture f) {
        UserPrediction pred = new UserPrediction();
        pred.setUser(user);
        pred.setFixture(f);
        pred.setPick(pick);
        pred.setHomeScore(home);
        pred.setAwayScore(away);
        pred.setPoints(0);
        pred.setCorrect(false);
        return pred;
    }
}
