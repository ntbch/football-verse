package com.footballverse.minigame.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.minigame.model.MinigamePlayer;
import com.footballverse.minigame.repository.MinigamePlayerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression guard for the frozen eligible-pool bug: once the catalog reaches
 * its initial size, bootstrap() must keep enriching stale players instead of
 * waiting for the 00:05 cron.
 */
@ExtendWith(MockitoExtension.class)
class MinigameCatalogSchedulerTest {
    private static final String PROVIDER = "ESPN";

    @Mock private EspnClient espn;
    @Mock private TheSportsDbClient sportsDb;
    @Mock private MinigamePlayerRepository players;
    @Mock private DailyMinigameService games;

    private final ObjectMapper mapper = new ObjectMapper();

    private MinigameCatalogScheduler scheduler() {
        return new MinigameCatalogScheduler(espn, sportsDb, players, mapper, games);
    }

    private MinigamePlayer player(Instant refreshedAt) {
        MinigamePlayer player = new MinigamePlayer();
        player.setProvider(PROVIDER);
        player.setProviderPlayerId(1L);
        player.setName("Test Player");
        player.setNormalizedName("test player");
        player.setCurrentClub("Arsenal");
        player.setCareerClubs("[]");
        player.setRefreshedAt(refreshedAt);
        return player;
    }

    @Test
    void bootstrapEnrichesStalePlayersOnceCatalogIsFull() {
        when(players.countByProvider(PROVIDER)).thenReturn(1007L);
        MinigamePlayer stale = player(Instant.EPOCH);
        when(players.findTop20ByProviderOrderByRefreshedAtAsc(PROVIDER)).thenReturn(List.of(stale));
        lenient().when(sportsDb.configured()).thenReturn(true);
        lenient().when(sportsDb.rateLimited()).thenReturn(false);
        // No SportsDB match: enrich() must still mark the record as refreshed.
        when(sportsDb.searchPlayers("Test Player")).thenReturn(mapper.createObjectNode());

        scheduler().bootstrap();

        verify(players).save(stale);
        assertTrue(stale.getRefreshedAt().isAfter(Instant.EPOCH), "stale player should be re-refreshed");
    }

    @Test
    void bootstrapSkipsEnrichmentWhenAllPlayersAreFresh() {
        when(players.countByProvider(PROVIDER)).thenReturn(1007L);
        when(sportsDb.configured()).thenReturn(true);
        when(sportsDb.rateLimited()).thenReturn(false);
        when(players.findTop20ByProviderOrderByRefreshedAtAsc(PROVIDER))
                .thenReturn(List.of(player(Instant.now())));

        scheduler().bootstrap();

        verify(sportsDb, never()).searchPlayers(org.mockito.ArgumentMatchers.anyString());
        verify(games).ensureBuffer();
    }
}
