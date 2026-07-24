package com.footballverse.prediction.service;

import com.footballverse.prediction.dto.BadgeResponse;
import com.footballverse.prediction.dto.LeaderboardEntryResponse;
import com.footballverse.prediction.dto.StatsResponse;
import com.footballverse.prediction.model.PredictionStats;
import com.footballverse.prediction.model.UserBadge;
import com.footballverse.prediction.model.UserPrediction;
import com.footballverse.prediction.repository.PredictionStatsRepository;
import com.footballverse.prediction.repository.UserBadgeRepository;
import com.footballverse.prediction.repository.UserPredictionRepository;
import com.footballverse.user.model.UserProfile;
import com.footballverse.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
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
public class LeaderboardService {

    private final UserPredictionRepository predictionRepo;
    private final PredictionStatsRepository statsRepo;
    private final UserBadgeRepository badgeRepo;
    private final UserProfileRepository profileRepo;

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
}
