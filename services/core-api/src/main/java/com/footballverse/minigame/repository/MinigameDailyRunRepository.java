package com.footballverse.minigame.repository;

import com.footballverse.minigame.model.MinigameDailyRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface MinigameDailyRunRepository extends JpaRepository<MinigameDailyRun, Long> {
    Optional<MinigameDailyRun> findByUserIdAndPlayDate(Long userId, LocalDate playDate);
    Optional<MinigameDailyRun> findByGuestTokenHashAndPlayDate(String guestTokenHash, LocalDate playDate);
}
