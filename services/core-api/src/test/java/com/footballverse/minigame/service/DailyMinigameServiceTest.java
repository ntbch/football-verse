package com.footballverse.minigame.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.minigame.model.MinigameChallenge;
import com.footballverse.minigame.model.MinigameAttempt;
import com.footballverse.minigame.model.MinigameAttemptMode;
import com.footballverse.minigame.model.MinigameAttemptStatus;
import com.footballverse.minigame.model.MinigamePlayer;
import com.footballverse.minigame.model.MinigameType;
import com.footballverse.minigame.repository.MinigameAttemptRepository;
import com.footballverse.minigame.repository.MinigameChallengeRepository;
import com.footballverse.minigame.repository.MinigamePlayerRepository;
import com.footballverse.user.model.UserAccount;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class DailyMinigameServiceTest {
    @Mock private MinigamePlayerRepository players;
    @Mock private MinigameChallengeRepository challenges;
    @Mock private MinigameAttemptRepository attempts;

    @Test
    void scoreRewardsFewerCluesAndPreventsNegativePoints() {
        assertEquals(30, DailyMinigameService.whoAmIScore(0, 0));
        assertEquals(10, DailyMinigameService.whoAmIScore(3, 1));
        assertEquals(0, DailyMinigameService.whoAmIScore(5, 6));
    }

    @Test
    void playerSearchStaysWithinTheMinigameProvider() {
        MinigamePlayer player = new MinigamePlayer();
        player.setId(9L);
        player.setName("Alex Example");
        when(players.findByProviderAndNormalizedNameContainingOrderByNameAsc(eq("ESPN"), eq("alex"), any())).thenReturn(List.of(player));

        assertEquals(9L, new DailyMinigameService(players, challenges, attempts, new ObjectMapper()).searchPlayers("alex").getFirst().id());
    }

    @Test
    void gridRequiresNineDistinctPlayers() {
        Map<String, List<Long>> valid = new LinkedHashMap<>();
        for (long cell = 1; cell <= 9; cell++) valid.put("cell-" + cell, List.of(cell, 99L));
        assertTrue(DailyMinigameService.hasDistinctGridSolution(valid));

        Map<String, List<Long>> impossible = new LinkedHashMap<>();
        for (long cell = 1; cell <= 9; cell++) impossible.put("cell-" + cell, List.of(1L));
        assertFalse(DailyMinigameService.hasDistinctGridSolution(impossible));
    }

    @Test
    void dailyPayloadNeverLeaksTheMysteryAnswer() {
        MinigamePlayer player = new MinigamePlayer();
        player.setId(7L);
        player.setProviderPlayerId(99L);
        player.setName("Alex Example");
        player.setNormalizedName(DailyMinigameService.normalize(player.getName()));
        player.setNationality("France");
        player.setPosition("Attacker");
        player.setCareerClubs("[\"Club One\",\"Club Two\"]");
        player.setSeasonLabel("Example League 2025");
        player.setSeasonAppearances(28);
        player.setSeasonGoals(14);
        player.setSeasonAssists(8);
        player.setTrophyCount(3);
        MinigameChallenge challenge = new MinigameChallenge();
        challenge.setId(11L);
        challenge.setGameType(MinigameType.WHO_AM_I);
        challenge.setPublicPayload("{\"kind\":\"who-am-i\",\"maxGuesses\":3,\"initialClues\":2,\"clues\":[\"A clue\"]}");
        when(challenges.findByPlayDateAndGameType(any(), eq(MinigameType.WHO_AM_I))).thenReturn(Optional.of(challenge));
        when(challenges.findByPlayDateAndGameType(any(), eq(MinigameType.GRID))).thenReturn(Optional.empty());

        DailyMinigameService service = new DailyMinigameService(players, challenges, attempts, new ObjectMapper());
        var whoAmI = service.daily(null).games().stream().filter(game -> game.type().name().equals("WHO_AM_I")).findFirst().orElseThrow();

        assertTrue(whoAmI.available());
        assertFalse(whoAmI.puzzle().toString().contains("Alex Example"));
        assertFalse(whoAmI.puzzle().containsKey("answerId"));
    }

    @Test
    void revealReturnsTheFlushedOptimisticLockVersion() {
        UserAccount user = new UserAccount();
        user.setId(4L);
        MinigameChallenge challenge = new MinigameChallenge();
        challenge.setGameType(MinigameType.WHO_AM_I);
        MinigameAttempt attempt = new MinigameAttempt();
        attempt.setId(12L);
        attempt.setUser(user);
        attempt.setChallenge(challenge);
        attempt.setStatePayload("{\"guesses\":[],\"gridCells\":{}}");
        attempt.setVersion(0);
        when(attempts.findByIdAndUserId(12L, 4L)).thenReturn(Optional.of(attempt));
        when(attempts.saveAndFlush(any())).thenAnswer(invocation -> {
            MinigameAttempt saved = invocation.getArgument(0);
            saved.setVersion(1);
            return saved;
        });

        DailyMinigameService service = new DailyMinigameService(players, challenges, attempts, new ObjectMapper());

        assertEquals(1, service.reveal(user, 12L, 0).version());
    }

    @Test
    void officialStartUsesTheAtomicInsertPath() {
        UserAccount user = new UserAccount();
        user.setId(4L);
        MinigameChallenge challenge = new MinigameChallenge();
        challenge.setId(7L);
        challenge.setGameType(MinigameType.WHO_AM_I);
        MinigameAttempt attempt = new MinigameAttempt();
        attempt.setId(12L);
        attempt.setUser(user);
        attempt.setChallenge(challenge);
        attempt.setMode(MinigameAttemptMode.OFFICIAL);
        attempt.setStatePayload("{\"guesses\":[],\"gridCells\":{}}");
        when(challenges.findByPlayDateAndGameType(any(), eq(MinigameType.WHO_AM_I))).thenReturn(Optional.of(challenge));
        when(attempts.findByUserIdAndChallengeIdAndAttemptKey(4L, 7L, "official")).thenReturn(Optional.empty(), Optional.of(attempt));

        DailyMinigameService service = new DailyMinigameService(players, challenges, attempts, new ObjectMapper());

        assertEquals(12L, service.start(user, MinigameType.WHO_AM_I, false).id());
        verify(attempts).insertOfficialIfAbsent(eq(4L), eq(7L), any(), any());
    }

    @Test
    void guestStartCreatesAHashedOfficialAttempt() {
        MinigameChallenge challenge = new MinigameChallenge();
        challenge.setId(7L);
        challenge.setGameType(MinigameType.WHO_AM_I);
        when(challenges.findByPlayDateAndGameType(any(), eq(MinigameType.WHO_AM_I))).thenReturn(Optional.of(challenge));
        when(attempts.findByGuestTokenHashAndChallengeIdAndAttemptKey(any(), eq(7L), eq("official"))).thenReturn(Optional.empty());
        when(attempts.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = new DailyMinigameService(players, challenges, attempts, new ObjectMapper())
                .start(null, "guest-token", MinigameType.WHO_AM_I, false);

        assertEquals(MinigameAttemptMode.OFFICIAL, response.mode());
        org.mockito.ArgumentCaptor<MinigameAttempt> saved = org.mockito.ArgumentCaptor.forClass(MinigameAttempt.class);
        verify(attempts).saveAndFlush(saved.capture());
        assertNotEquals("guest-token", saved.getValue().getGuestTokenHash());
    }

    @Test
    void dailyMarksAnExpiredOfficialAttemptAsLostBeforeReturningIt() {
        MinigameChallenge challenge = new MinigameChallenge();
        challenge.setId(7L);
        challenge.setGameType(MinigameType.WHO_AM_I);
        challenge.setPublicPayload("{}");
        challenge.setAnswerPayload("{\"answerName\":\"Alex Example\",\"comparison\":{}}");
        MinigameAttempt attempt = new MinigameAttempt();
        attempt.setChallenge(challenge);
        attempt.setMode(MinigameAttemptMode.OFFICIAL);
        attempt.setStatus(MinigameAttemptStatus.ACTIVE);
        attempt.setCreatedAt(Instant.now().minusSeconds(301));
        attempt.setStatePayload("{\"guesses\":[],\"gridCells\":{}}");
        when(challenges.findByPlayDateAndGameType(any(), eq(MinigameType.WHO_AM_I))).thenReturn(Optional.of(challenge));
        when(challenges.findByPlayDateAndGameType(any(), eq(MinigameType.GRID))).thenReturn(Optional.empty());
        when(attempts.findByGuestTokenHashAndChallengeIdAndAttemptKey(any(), eq(7L), eq("official"))).thenReturn(Optional.of(attempt));
        when(attempts.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var game = new DailyMinigameService(players, challenges, attempts, new ObjectMapper()).daily(null, "guest-token").games().getFirst();

        assertEquals(MinigameAttemptStatus.LOST, game.attempt().status());
        verify(attempts).saveAndFlush(attempt);
    }
}
