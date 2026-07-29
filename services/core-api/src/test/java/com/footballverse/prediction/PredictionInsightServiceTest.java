package com.footballverse.prediction;

import com.footballverse.prediction.dto.CommunityPredictionDistributionResponse;
import com.footballverse.prediction.dto.CurrentLeaderboardResponse;
import com.footballverse.prediction.repository.FixtureRepository;
import com.footballverse.prediction.repository.PredictionStatsRepository;
import com.footballverse.prediction.repository.UserBadgeRepository;
import com.footballverse.prediction.repository.UserPredictionRepository;
import com.footballverse.prediction.service.FixtureService;
import com.footballverse.prediction.service.LeaderboardService;
import com.footballverse.prediction.service.UserPredictionService;
import com.footballverse.user.repository.UserProfileRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PredictionInsightServiceTest {

    @Test
    void weeklyRankUsesOnlyServerScoredTotalsAndCalculatesAccuracy() {
        UserPredictionRepository predictions = mock(UserPredictionRepository.class);
        PredictionStatsRepository stats = mock(PredictionStatsRepository.class);
        LeaderboardService service = new LeaderboardService(
                predictions, stats, mock(UserBadgeRepository.class), mock(UserProfileRepository.class)
        );
        UserPredictionRepository.PeriodScore score = mock(UserPredictionRepository.PeriodScore.class);
        when(score.getPoints()).thenReturn(18L);
        when(score.getCorrectPicks()).thenReturn(3L);
        when(score.getTotalPicks()).thenReturn(4L);
        when(predictions.findPeriodScoreForUser(eq(42L), any(Instant.class))).thenReturn(Optional.of(score));
        when(predictions.countPeriodUsersRankedAhead(any(Instant.class), eq(18L), eq(42L))).thenReturn(2L);

        CurrentLeaderboardResponse response = service.currentLeaderboard(42L, "weekly");

        assertEquals("weekly", response.period());
        assertEquals(3, response.rank());
        assertEquals(18, response.points());
        assertEquals(75, response.accuracy());
    }

    @Test
    void communityDistributionCountsOnlyKnownOutcomePicks() {
        FixtureRepository fixtures = mock(FixtureRepository.class);
        UserPredictionRepository predictions = mock(UserPredictionRepository.class);
        UserPredictionService service = new UserPredictionService(fixtures, predictions, mock(FixtureService.class));
        when(fixtures.existsById(17L)).thenReturn(true);
        List<UserPredictionRepository.PickCount> counts = List.of(
                pickCount("home", 7L), pickCount("draw", 2L), pickCount("away", 5L), pickCount("other", 99L)
        );
        when(predictions.countPicksByFixtureId(17L)).thenReturn(counts);

        CommunityPredictionDistributionResponse response = service.communityDistribution(17L);

        assertEquals(7, response.home());
        assertEquals(2, response.draw());
        assertEquals(5, response.away());
        assertEquals(14, response.total());
    }

    private UserPredictionRepository.PickCount pickCount(String pick, long count) {
        UserPredictionRepository.PickCount projection = mock(UserPredictionRepository.PickCount.class);
        when(projection.getPick()).thenReturn(pick);
        when(projection.getCount()).thenReturn(count);
        return projection;
    }
}
