package com.footballverse.minigame.repository;

import com.footballverse.minigame.model.MinigameAttempt;
import com.footballverse.minigame.model.MinigameAttemptMode;
import com.footballverse.minigame.model.MinigameAttemptStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.time.Instant;

public interface MinigameAttemptRepository extends JpaRepository<MinigameAttempt, Long> {
    Optional<MinigameAttempt> findByUserIdAndChallengeIdAndAttemptKey(Long userId, Long challengeId, String attemptKey);
    Optional<MinigameAttempt> findByIdAndUserId(Long id, Long userId);
    Optional<MinigameAttempt> findByIdAndGuestTokenHash(Long id, String guestTokenHash);
    Optional<MinigameAttempt> findByGuestTokenHashAndChallengeIdAndAttemptKey(String guestTokenHash, Long challengeId, String attemptKey);
    List<MinigameAttempt> findByGuestTokenHash(String guestTokenHash);

    @Modifying
    @Query(value = """
            insert into minigame_attempts (user_id, challenge_id, attempt_key, mode, status, version, wrong_guesses,
                revealed_clues, score, state_payload, completed_at, created_at, updated_at)
            values (:userId, :challengeId, 'official', 'OFFICIAL', 'ACTIVE', 0, 0, 0, 0, :statePayload, null, :now, :now)
            on conflict (user_id, challenge_id, attempt_key) do nothing
            """, nativeQuery = true)
    int insertOfficialIfAbsent(@Param("userId") Long userId, @Param("challengeId") Long challengeId,
                               @Param("statePayload") String statePayload, @Param("now") Instant now);
    @Query("""
            select a from MinigameAttempt a join fetch a.user u
            where a.challenge.id = :challengeId and a.mode = :mode and a.status <> 'ACTIVE'
            order by a.score desc, a.completedAt asc, a.id asc
            """)
    List<MinigameAttempt> completed(@Param("challengeId") Long challengeId, @Param("mode") MinigameAttemptMode mode, Pageable pageable);

    @Query("""
            select a from MinigameAttempt a join fetch a.user u
            where a.challenge.id in :challengeIds and a.mode = :mode and a.status <> 'ACTIVE'
            """)
    List<MinigameAttempt> completedForChallenges(@Param("challengeIds") List<Long> challengeIds,
                                                  @Param("mode") MinigameAttemptMode mode);
}
