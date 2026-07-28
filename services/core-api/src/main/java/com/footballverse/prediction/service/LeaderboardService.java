package com.footballverse.prediction.service;

import com.footballverse.prediction.dto.BadgeResponse;
import com.footballverse.prediction.dto.LeaderboardEntryResponse;
import com.footballverse.prediction.dto.StatsResponse;
import com.footballverse.prediction.model.PredictionStats;
import com.footballverse.prediction.model.UserBadge;
import com.footballverse.prediction.repository.PredictionStatsRepository;
import com.footballverse.prediction.repository.UserBadgeRepository;
import com.footballverse.prediction.repository.UserPredictionRepository;
import com.footballverse.user.model.UserProfile;
import com.footballverse.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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
    public List<LeaderboardEntryResponse> leaderboard(String period) {
        return leaderboard(period, 100);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "leaderboard", key = "#period + ':' + #limit")
    public List<LeaderboardEntryResponse> leaderboard(String period, int limit) {
        if ("weekly".equals(period)) {
            Instant weekStart = Instant.now().minusSeconds(7 * 24 * 60 * 60);
            List<UserPredictionRepository.WeeklyScore> weeklyScores = predictionRepo.findWeeklyScores(weekStart, PageRequest.of(0, limit));
            List<Long> userIds = weeklyScores.stream().map(UserPredictionRepository.WeeklyScore::getUserId).toList();
            Map<Long, PredictionStats> statsByUserId = statsRepo.findByUserIdIn(userIds).stream()
                    .collect(Collectors.toMap(s -> s.getUser().getId(), s -> s));
            Map<Long, UserProfile> profilesById = profileRepo.findByUserIdIn(userIds)
                    .stream().collect(Collectors.toMap(p -> p.getUser().getId(), p -> p, (a, b) -> a));

            AtomicInteger rank = new AtomicInteger(1);
            return weeklyScores.stream()
                    .filter(score -> statsByUserId.containsKey(score.getUserId()))
                    .map(score -> leaderboardEntry(statsByUserId.get(score.getUserId()), profilesById.get(score.getUserId()), score.getPoints(), score.getCorrectPicks(), rank.getAndIncrement()))
                    .collect(Collectors.toList());
        }

        List<PredictionStats> all = statsRepo.findAllByOrderByTotalPointsDesc(PageRequest.of(0, limit));
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
