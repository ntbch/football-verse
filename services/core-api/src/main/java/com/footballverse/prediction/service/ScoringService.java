package com.footballverse.prediction.service;

import com.footballverse.notification.model.NotificationType;
import com.footballverse.notification.service.NotificationService;
import com.footballverse.prediction.dto.LeaderboardEntryResponse;
import com.footballverse.prediction.dto.PredictionScoreLogResponse;
import com.footballverse.prediction.dto.StatsResponse;
import com.footballverse.prediction.model.Fixture;
import com.footballverse.prediction.model.PredictionScoreLog;
import com.footballverse.prediction.model.PredictionStats;
import com.footballverse.prediction.model.UserBadge;
import com.footballverse.prediction.model.UserPrediction;
import com.footballverse.prediction.repository.FixtureRepository;
import com.footballverse.prediction.repository.PredictionScoreLogRepository;
import com.footballverse.prediction.repository.PredictionStatsRepository;
import com.footballverse.prediction.repository.UserBadgeRepository;
import com.footballverse.prediction.repository.UserPredictionRepository;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScoringService {

    private final FixtureRepository fixtureRepo;
    private final UserPredictionRepository predictionRepo;
    private final PredictionStatsRepository statsRepo;
    private final UserBadgeRepository badgeRepo;
    private final UserAccountRepository userAccountRepo;
    private final PredictionScoreLogRepository scoreLogRepo;
    private final NotificationService notificationService;
    private final LeaderboardService leaderboardService;

    public StatsResponse stats(Long userId) {
        return leaderboardService.stats(userId);
    }

    public List<LeaderboardEntryResponse> leaderboard(String period) {
        return leaderboardService.leaderboard(period);
    }

    @Transactional
    @CacheEvict(value = "leaderboard", allEntries = true)
    public void scoreFixture(Long fixtureId) {
        Fixture fixture = fixtureRepo.findByIdForUpdate(fixtureId)
                .orElseThrow(() -> new IllegalArgumentException("Fixture not found"));
        if (fixture.isScored()) return;
        if (!"result".equals(fixture.getStatus())) return;
        if (fixture.getHomeScore() == null || fixture.getAwayScore() == null) return;

        fixture.setScored(true);
        fixture.setScoredAt(Instant.now());
        fixtureRepo.save(fixture);

        int homeScore = fixture.getHomeScore();
        int awayScore = fixture.getAwayScore();

        List<UserPrediction> predictions = predictionRepo.findByFixtureId(fixtureId);
        for (UserPrediction pred : predictions) {
            boolean outcomeCorrect = isOutcomeCorrect(pred.getPick(), homeScore, awayScore);
            boolean scoreExact = pred.getHomeScore() != null && pred.getAwayScore() != null
                    && pred.getHomeScore() == homeScore && pred.getAwayScore() == awayScore;
            boolean ou25Correct = isOu25Correct(pred.getPickOu25(), homeScore, awayScore);
            boolean bttsCorrect = isBttsCorrect(pred.getPickBtts(), homeScore, awayScore);

            int outcomePts = outcomeCorrect ? 3 : 0;
            int exactScorePts = scoreExact ? 5 : 0;
            int ou25Pts = ou25Correct ? 2 : 0;
            int bttsPts = bttsCorrect ? 2 : 0;
            int points = outcomePts + exactScorePts + ou25Pts + bttsPts;

            pred.setPoints(points);
            pred.setCorrect(outcomeCorrect || scoreExact || ou25Correct || bttsCorrect);
            pred.setCorrectOutcome(outcomeCorrect);
            pred.setCorrectExactScore(scoreExact);
            pred.setCorrectOu25(ou25Correct);
            pred.setCorrectBtts(bttsCorrect);
            predictionRepo.save(pred);

            PredictionScoreLog logEntity = new PredictionScoreLog();
            logEntity.setPrediction(pred);
            logEntity.setFixture(fixture);
            logEntity.setUser(pred.getUser());
            logEntity.setPoints(points);
            logEntity.setOutcomePoints(outcomePts);
            logEntity.setExactScorePoints(exactScorePts);
            logEntity.setOu25Points(ou25Pts);
            logEntity.setBttsPoints(bttsPts);
            logEntity.setScoredAt(Instant.now());
            StringBuilder reasonBuilder = new StringBuilder();
            if (outcomeCorrect) reasonBuilder.append("Outcome Correct (+3). ");
            if (scoreExact) reasonBuilder.append("Exact Score Correct (+5). ");
            if (ou25Correct) reasonBuilder.append("O/U 2.5 Correct (+2). ");
            if (bttsCorrect) reasonBuilder.append("BTTS Correct (+2). ");
            if (points == 0) reasonBuilder.append("No correct markets.");
            logEntity.setReason(reasonBuilder.toString().trim());
            scoreLogRepo.save(logEntity);

            notificationService.create(
                    pred.getUser(),
                    NotificationType.PREDICTION_SCORED,
                    "Your prediction for " + fixture.getHomeTeam() + " vs " + fixture.getAwayTeam()
                            + " has been scored. You earned " + points + " points.",
                    "/predictions"
            );

            PredictionStats stats = getOrCreateStats(pred.getUser());
            stats.setTotalPoints(stats.getTotalPoints() + points);
            stats.setTotalPicks(stats.getTotalPicks() + 1);
            if (outcomeCorrect || scoreExact) {
                stats.setCorrectPicks(stats.getCorrectPicks() + 1);
                stats.setCurrentStreak(stats.getCurrentStreak() + 1);
                stats.setBestStreak(Math.max(stats.getBestStreak(), stats.getCurrentStreak()));
                checkStreakBadges(pred.getUser().getId(), stats.getCurrentStreak());
            } else {
                stats.setCurrentStreak(0);
            }
            statsRepo.save(stats);
        }
    }

    private boolean isOutcomeCorrect(String pick, int homeScore, int awayScore) {
        String actual;
        if (homeScore > awayScore) actual = "home";
        else if (awayScore > homeScore) actual = "away";
        else actual = "draw";
        return pick.equals(actual);
    }

    private boolean isOu25Correct(String pickOu25, int homeScore, int awayScore) {
        if (pickOu25 == null) return false;
        int total = homeScore + awayScore;
        return "over".equals(pickOu25) == (total > 2.5);
    }

    private boolean isBttsCorrect(String pickBtts, int homeScore, int awayScore) {
        if (pickBtts == null) return false;
        boolean bothScored = homeScore > 0 && awayScore > 0;
        return "yes".equals(pickBtts) == bothScored;
    }

    private PredictionStats getOrCreateStats(UserAccount user) {
        return statsRepo.findByUserId(user.getId())
                .orElseGet(() -> {
                    PredictionStats s = new PredictionStats();
                    s.setUser(user);
                    return statsRepo.save(s);
                });
    }

    private void checkStreakBadges(Long userId, int streak) {
        awardBadgeIfMissing(userId, "first_pick", true);
        awardBadgeIfMissing(userId, "streak_5", streak >= 5);
        awardBadgeIfMissing(userId, "streak_10", streak >= 10);
    }

    private void awardBadgeIfMissing(Long userId, String code, boolean condition) {
        if (condition && !badgeRepo.existsByUserIdAndBadgeCode(userId, code)) {
            UserBadge badge = new UserBadge();
            badge.setUser(userAccountRepo.getReferenceById(userId));
            badge.setBadgeCode(code);
            badge.setAwardedAt(Instant.now());
            badgeRepo.save(badge);
        }
    }

    @Transactional(readOnly = true)
    public List<PredictionScoreLogResponse> getScoreLogs(Long userId) {
        return scoreLogRepo.findByUserIdOrderByScoredAtDesc(userId).stream()
                .map(log -> new PredictionScoreLogResponse(
                        log.getId(),
                        log.getPrediction().getId(),
                        log.getFixture().getId(),
                        log.getFixture().getHomeTeam(),
                        log.getFixture().getAwayTeam(),
                        log.getFixture().getHomeScore(),
                        log.getFixture().getAwayScore(),
                        log.getPoints(),
                        log.getOutcomePoints(),
                        log.getExactScorePoints(),
                        log.getOu25Points(),
                        log.getBttsPoints(),
                        log.getReason(),
                        log.getScoredAt() != null ? log.getScoredAt().toString() : null
                ))
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = "leaderboard", allEntries = true)
    public void rescoreFixture(Long fixtureId) {
        Fixture fixture = fixtureRepo.findByIdForUpdate(fixtureId)
                .orElseThrow(() -> new IllegalArgumentException("Fixture not found"));
        if (!fixture.isScored()) return;

        List<PredictionScoreLog> logs = scoreLogRepo.findByFixtureId(fixtureId);
        for (PredictionScoreLog log : logs) {
            UserPrediction pred = log.getPrediction();
            pred.setPoints(0);
            pred.setCorrect(false);
            pred.setCorrectOutcome(false);
            pred.setCorrectExactScore(false);
            pred.setCorrectOu25(false);
            pred.setCorrectBtts(false);
            predictionRepo.save(pred);

            PredictionStats stats = getOrCreateStats(log.getUser());
            stats.setTotalPoints(Math.max(0, stats.getTotalPoints() - log.getPoints()));
            stats.setTotalPicks(Math.max(0, stats.getTotalPicks() - 1));
            if (log.getOutcomePoints() > 0 || log.getExactScorePoints() > 0) {
                stats.setCorrectPicks(Math.max(0, stats.getCorrectPicks() - 1));
            }
            statsRepo.save(stats);

            scoreLogRepo.delete(log);
        }

        fixture.setScored(false);
        fixture.setScoredAt(null);
        fixtureRepo.save(fixture);

        scoreFixture(fixtureId);
    }
}
