package com.footballverse.prediction;

import com.footballverse.prediction.dto.BadgeResponse;
import com.footballverse.prediction.dto.LeaderboardEntryResponse;
import com.footballverse.prediction.dto.StatsResponse;
import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
import com.footballverse.user.UserProfile;
import com.footballverse.user.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScoringService {

    private final FixtureRepository fixtureRepo;
    private final UserPredictionRepository predictionRepo;
    private final PredictionStatsRepository statsRepo;
    private final UserBadgeRepository badgeRepo;
    private final UserProfileRepository profileRepo;
    private final UserAccountRepository userAccountRepo;

    @Transactional(readOnly = true)
    public StatsResponse stats(Long userId) {
        PredictionStats s = statsRepo.findByUserId(userId)
                .orElse(new PredictionStats());
        List<UserBadge> badges = badgeRepo.findByUserId(userId);
        return new StatsResponse(
                s.getTotalPoints(),
                s.getCorrectPicks(),
                s.getTotalPicks(),
                s.getCurrentStreak(),
                s.getBestStreak(),
                badges.stream()
                        .map(b -> new BadgeResponse(b.getBadgeCode(), b.getAwardedAt().toString()))
                        .collect(Collectors.toList())
        );
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "leaderboard", key = "#period")
    public List<LeaderboardEntryResponse> leaderboard(String period) {
        List<PredictionStats> all;
        if ("weekly".equals(period)) {
            Instant weekStart = Instant.now().minusSeconds(7 * 24 * 60 * 60);
            List<UserPrediction> weeklyPredictions = predictionRepo.findByFixtureKickoffAfter(weekStart);
            Map<Long, Integer> weeklyPoints = weeklyPredictions.stream()
                    .collect(Collectors.groupingBy(
                            p -> p.getUser().getId(),
                            Collectors.summingInt(UserPrediction::getPoints)));
            Map<Long, Long> weeklyCorrect = weeklyPredictions.stream()
                    .filter(UserPrediction::isCorrect)
                    .collect(Collectors.groupingBy(p -> p.getUser().getId(), Collectors.counting()));

            all = statsRepo.findAllByOrderByTotalPointsDesc().stream()
                    .filter(s -> weeklyPoints.containsKey(s.getUser().getId()))
                    .collect(Collectors.toList());

            // Score by weekly points, batch-load profiles
            List<Long> userIds = all.stream().map(s -> s.getUser().getId()).collect(Collectors.toList());
            Map<Long, UserProfile> profilesById = profileRepo.findByUserIdIn(userIds)
                    .stream().collect(Collectors.toMap(p -> p.getUser().getId(), p -> p, (a, b) -> a));

            AtomicInteger rank = new AtomicInteger(1);
            return all.stream()
                    .sorted(Comparator.comparingInt((PredictionStats s) -> weeklyPoints.getOrDefault(s.getUser().getId(), 0)).reversed())
                    .map(s -> leaderboardEntry(s, profilesById.get(s.getUser().getId()), weeklyPoints.getOrDefault(s.getUser().getId(), 0), weeklyCorrect.getOrDefault(s.getUser().getId(), 0L), rank.getAndIncrement()))
                    .collect(Collectors.toList());
        }

        all = statsRepo.findAllByOrderByTotalPointsDesc();
        if (all.isEmpty()) return List.of();

        List<Long> userIds = all.stream().map(s -> s.getUser().getId()).collect(Collectors.toList());
        Map<Long, UserProfile> profilesById = profileRepo.findByUserIdIn(userIds)
                .stream().collect(Collectors.toMap(p -> p.getUser().getId(), p -> p, (a, b) -> a));

        AtomicInteger rank = new AtomicInteger(1);
        return all.stream()
                .map(s -> leaderboardEntry(s, profilesById.get(s.getUser().getId()), s.getTotalPoints(), s.getCorrectPicks(), rank.getAndIncrement()))
                .collect(Collectors.toList());
    }

    private LeaderboardEntryResponse leaderboardEntry(PredictionStats s, UserProfile profile, long points, long correctPicks, int rank) {
        return new LeaderboardEntryResponse(
                s.getUser().getId(),
                s.getUser().getUsername(),
                profile != null ? profile.getDisplayName() : s.getUser().getUsername(),
                profile != null ? profile.getAvatarUrl() : null,
                (int) points,
                correctPicks,
                s.getTotalPicks(),
                rank
        );
    }

    @Transactional
    @CacheEvict(value = "leaderboard", allEntries = true)
    public void scoreFixture(Long fixtureId) {
        Fixture fixture = fixtureRepo.findById(fixtureId).orElseThrow();
        if (fixture.isScored()) return;
        if (fixture.getHomeScore() == null || fixture.getAwayScore() == null) return;

        fixture.setScored(true);
        int homeScore = fixture.getHomeScore();
        int awayScore = fixture.getAwayScore();

        List<UserPrediction> predictions = predictionRepo.findByFixtureId(fixtureId);
        for (UserPrediction pred : predictions) {
            boolean outcomeCorrect = isOutcomeCorrect(pred.getPick(), homeScore, awayScore);
            boolean scoreExact = pred.getHomeScore() != null && pred.getAwayScore() != null
                    && pred.getHomeScore() == homeScore && pred.getAwayScore() == awayScore;
            boolean ou25Correct = isOu25Correct(pred.getPickOu25(), homeScore, awayScore);
            boolean bttsCorrect = isBttsCorrect(pred.getPickBtts(), homeScore, awayScore);

            int points = 0;
            if (outcomeCorrect) points += 3;
            if (scoreExact) points += 5;
            if (ou25Correct) points += 2;
            if (bttsCorrect) points += 2;

            pred.setPoints(points);
            pred.setCorrect(outcomeCorrect || scoreExact || ou25Correct || bttsCorrect);
            pred.setCorrectOutcome(outcomeCorrect);
            pred.setCorrectExactScore(scoreExact);
            pred.setCorrectOu25(ou25Correct);
            pred.setCorrectBtts(bttsCorrect);
            predictionRepo.save(pred);

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
}
