package com.footballverse.prediction.service;

import com.footballverse.prediction.dto.BadgeResponse;
import com.footballverse.prediction.dto.CurrentLeaderboardResponse;
import com.footballverse.prediction.dto.LeaderboardEntryResponse;
import com.footballverse.prediction.dto.StatsResponse;
import com.footballverse.common.pagination.PageResponse;
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
import org.springframework.data.domain.Page;
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
    public List<LeaderboardEntryResponse> leaderboard(String period, int limit) {
        return leaderboardPage(period, 0, limit).content();
    }

    @Transactional(readOnly = true)
    public CurrentLeaderboardResponse currentLeaderboard(Long userId, String requestedPeriod) {
        String period = normalizePeriod(requestedPeriod);
        if ("all".equals(period)) {
            return statsRepo.findByUserId(userId)
                    .map(stats -> currentLeaderboard(
                            period,
                            Math.toIntExact(statsRepo.countRankedAhead(stats.getTotalPoints(), userId) + 1),
                            stats.getTotalPoints(),
                            stats.getCorrectPicks(),
                            stats.getTotalPicks()
                    ))
                    .orElseGet(() -> currentLeaderboard(period, null, 0, 0, 0));
        }

        Instant periodStart = periodStart(period);
        return predictionRepo.findPeriodScoreForUser(userId, periodStart)
                .map(score -> currentLeaderboard(
                        period,
                        Math.toIntExact(predictionRepo.countPeriodUsersRankedAhead(periodStart, score.getPoints(), userId) + 1),
                        score.getPoints().intValue(),
                        score.getCorrectPicks(),
                        score.getTotalPicks()
                ))
                .orElseGet(() -> currentLeaderboard(period, null, 0, 0, 0));
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "leaderboard", key = "#period + ':' + #page + ':' + #size")
    public PageResponse<LeaderboardEntryResponse> leaderboardPage(String period, int page, int size) {
        String normalizedPeriod = normalizePeriod(period);
        if (!"all".equals(normalizedPeriod)) {
            Instant periodStart = periodStart(normalizedPeriod);
            Page<UserPredictionRepository.PeriodScore> periodScores = predictionRepo.findPeriodScores(periodStart, PageRequest.of(page, size));
            if (periodScores.isEmpty()) {
                return new PageResponse<>(List.of(), periodScores.getNumber(), periodScores.getSize(), periodScores.getTotalElements(), periodScores.getTotalPages());
            }
            List<Long> userIds = periodScores.getContent().stream().map(UserPredictionRepository.PeriodScore::getUserId).toList();
            Map<Long, UserProfile> profilesById = profileRepo.findByUserIdIn(userIds)
                    .stream().collect(Collectors.toMap(p -> p.getUser().getId(), p -> p, (a, b) -> a));

            AtomicInteger rank = new AtomicInteger(page * size + 1);
            return PageResponse.from(periodScores.map(score -> periodLeaderboardEntry(
                    score,
                    profilesById.get(score.getUserId()),
                    rank.getAndIncrement()
            )));
        }

        Page<PredictionStats> all = statsRepo.findAllByOrderByTotalPointsDescUserIdAsc(PageRequest.of(page, size));
        if (all.isEmpty()) return new PageResponse<>(List.of(), all.getNumber(), all.getSize(), all.getTotalElements(), all.getTotalPages());

        List<Long> userIds = all.getContent().stream().map(s -> s.getUser().getId()).collect(Collectors.toList());
        Map<Long, UserProfile> profilesById = profileRepo.findByUserIdIn(userIds)
                .stream().collect(Collectors.toMap(p -> p.getUser().getId(), p -> p, (a, b) -> a));

        AtomicInteger rank = new AtomicInteger(page * size + 1);
        return PageResponse.from(all.map(stats -> leaderboardEntry(
                stats,
                profilesById.get(stats.getUser().getId()),
                stats.getTotalPoints(),
                stats.getCorrectPicks(),
                rank.getAndIncrement()
        )));
    }

    private String normalizePeriod(String period) {
        if ("weekly".equals(period) || "monthly".equals(period) || "all".equals(period)) return period;
        throw new IllegalArgumentException("Unsupported leaderboard period");
    }

    private Instant periodStart(String period) {
        return Instant.now().minusSeconds("monthly".equals(period) ? 30L * 24 * 60 * 60 : 7L * 24 * 60 * 60);
    }

    private CurrentLeaderboardResponse currentLeaderboard(
            String period,
            Integer rank,
            int points,
            long correctPicks,
            long totalPicks
    ) {
        int accuracy = totalPicks == 0 ? 0 : (int) Math.round(correctPicks * 100.0 / totalPicks);
        return new CurrentLeaderboardResponse(period, rank, points, correctPicks, totalPicks, accuracy);
    }

    private LeaderboardEntryResponse periodLeaderboardEntry(UserPredictionRepository.PeriodScore score, UserProfile profile, int rank) {
        return new LeaderboardEntryResponse(
                score.getUserId(),
                score.getUsername(),
                profile != null ? profile.getDisplayName() : score.getUsername(),
                profile != null ? profile.getAvatarUrl() : null,
                score.getPoints().intValue(),
                score.getCorrectPicks(),
                score.getTotalPicks(),
                rank
        );
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
