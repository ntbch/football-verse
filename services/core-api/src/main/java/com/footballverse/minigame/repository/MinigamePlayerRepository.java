package com.footballverse.minigame.repository;

import com.footballverse.minigame.model.MinigamePlayer;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MinigamePlayerRepository extends JpaRepository<MinigamePlayer, Long> {
    Optional<MinigamePlayer> findByProviderAndProviderPlayerId(String provider, long providerPlayerId);
    long countByProvider(String provider);
    long countByProviderAndCurrentClub(String provider, String currentClub);
    List<MinigamePlayer> findByProvider(String provider);
    List<MinigamePlayer> findByProviderAndNormalizedNameContainingOrderByNameAsc(String provider, String query, Pageable pageable);
    List<MinigamePlayer> findTop20ByProviderOrderByRefreshedAtAsc(String provider);
}
