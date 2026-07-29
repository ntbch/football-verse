package com.footballverse.prediction.service;

import com.footballverse.prediction.dto.JoinPrivateLeagueRequest;
import com.footballverse.prediction.dto.PrivateLeagueRequest;
import com.footballverse.prediction.model.PredictionLeagueCreateRequest;
import com.footballverse.prediction.model.PredictionLeague;
import com.footballverse.prediction.repository.PredictionLeagueCreateRequestRepository;
import com.footballverse.prediction.repository.PredictionLeagueMemberRepository;
import com.footballverse.prediction.repository.PredictionLeagueRepository;
import com.footballverse.prediction.repository.PredictionStatsRepository;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserProfileRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrivateLeagueServiceTest {
    @Mock private PredictionLeagueRepository leagues;
    @Mock private PredictionLeagueMemberRepository members;
    @Mock private PredictionLeagueCreateRequestRepository createRequests;
    @Mock private PredictionStatsRepository stats;
    @Mock private UserProfileRepository profiles;
    @Mock private CurrentUser currentUser;
    @Mock private UserAccount user;
    @Mock private PredictionLeague league;

    private PrivateLeagueService service;

    @BeforeEach
    void setUp() {
        service = new PrivateLeagueService(leagues, members, createRequests, stats, profiles, currentUser);
        when(currentUser.get()).thenReturn(user);
        when(user.getId()).thenReturn(12L);
        when(league.getId()).thenReturn(42L);
        when(league.getOwner()).thenReturn(user);
        when(league.getName()).thenReturn("Friends");
        when(league.getInviteCode()).thenReturn("AB12CD34");
        when(members.findRankedByLeagueId(42L, PageRequest.of(0, 5))).thenReturn(Page.empty());
    }

    @Test
    void joiningExistingMembershipIsIdempotentAndKeepsInvitePrivate() {
        when(leagues.findByInviteCode("AB12CD34")).thenReturn(Optional.of(league));
        when(members.existsByLeagueIdAndUserId(42L, 12L)).thenReturn(true);

        var response = service.join(new JoinPrivateLeagueRequest("ab12cd34"));

        assertThat(response.inviteCode()).isEqualTo("AB12CD34");
        verify(members, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void replayedCreateReturnsTheOriginalLeague() {
        UUID requestId = UUID.randomUUID();
        PredictionLeagueCreateRequest stored = org.mockito.Mockito.mock(PredictionLeagueCreateRequest.class);
        when(createRequests.lockByRequestId(requestId)).thenReturn(Optional.of(stored));
        when(stored.getOwnerId()).thenReturn(12L);
        when(stored.getLeague()).thenReturn(league);

        var response = service.create(new PrivateLeagueRequest("Friends"), requestId);

        assertThat(response.id()).isEqualTo(42L);
        verify(leagues, never()).save(org.mockito.ArgumentMatchers.any());
        verify(members, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
