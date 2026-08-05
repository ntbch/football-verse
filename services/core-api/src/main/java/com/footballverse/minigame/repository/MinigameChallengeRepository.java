package com.footballverse.minigame.repository;

import com.footballverse.minigame.model.MinigameChallenge;
import com.footballverse.minigame.model.MinigameType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

public interface MinigameChallengeRepository extends JpaRepository<MinigameChallenge, Long> {
    Optional<MinigameChallenge> findByPlayDateAndGameType(LocalDate playDate, MinigameType gameType);

    @Modifying
    @Query(value = """
            insert into minigame_challenges (play_date, game_type, public_payload, answer_payload, created_at)
            values (:playDate, :gameType, :publicPayload, :answerPayload, :createdAt)
            on conflict (play_date, game_type) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("playDate") LocalDate playDate, @Param("gameType") String gameType,
                       @Param("publicPayload") String publicPayload, @Param("answerPayload") String answerPayload,
                       @Param("createdAt") Instant createdAt);
}
