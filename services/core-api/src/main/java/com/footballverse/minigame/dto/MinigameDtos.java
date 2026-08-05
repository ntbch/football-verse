package com.footballverse.minigame.dto;

import com.footballverse.minigame.model.MinigameAttemptMode;
import com.footballverse.minigame.model.MinigameAttemptStatus;
import com.footballverse.minigame.model.MinigameType;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class MinigameDtos {
    private MinigameDtos() { }

    public record DailyResponse(String date, List<GameResponse> games) { }
    public record GameResponse(MinigameType type, boolean available, Long challengeId, Map<String, Object> puzzle,
                               AttemptResponse attempt) { }
    public record AttemptResponse(Long id, MinigameAttemptMode mode, MinigameAttemptStatus status, int version,
                                  int wrongGuesses, int revealedClues, int score, Map<String, Object> state,
                                  Map<String, Object> result, Instant startedAt, Instant completedAt) { }
    public record GuessRequest(@NotNull Long playerId, String cell, @NotNull Integer version) { }
    public record VersionRequest(@NotNull Integer version) { }
    public record PlayerOption(Long id, String name) { }
    public record LeaderboardEntry(int rank, String username, String displayName, String avatarUrl, int score,
                                   Instant completedAt) { }
    public record LeaderboardResponse(String scope, List<LeaderboardEntry> entries, Integer yourRank) { }
}
