package com.footballverse.prediction;

import com.footballverse.common.pagination.PageResponse;
import com.footballverse.prediction.controller.PredictionController;
import com.footballverse.prediction.dto.LeaderboardEntryResponse;
import com.footballverse.prediction.dto.PrivateLeagueResponse;
import com.footballverse.prediction.service.LeaderboardService;
import com.footballverse.prediction.service.MatchCentreService;
import com.footballverse.prediction.service.PrivateLeagueService;
import com.footballverse.prediction.service.ScoringService;
import com.footballverse.prediction.service.UserPredictionService;
import com.footballverse.security.CurrentUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PredictionControllerContractTest {
    @Mock private UserPredictionService predictionService;
    @Mock private MatchCentreService matchCentreService;
    @Mock private LeaderboardService leaderboardService;
    @Mock private ScoringService scoringService;
    @Mock private CurrentUser currentUser;
    @Mock private PrivateLeagueService privateLeagueService;
    @InjectMocks private PredictionController controller;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void privateLeagueListClampsPagingToItsDocumentedBounds() {
        PageResponse<PrivateLeagueResponse> expected = new PageResponse<>(List.of(), 0, 20, 0, 0);
        when(privateLeagueService.mine(0, 20)).thenReturn(expected);

        var response = controller.privateLeagues(-1, 99);

        assertThat(response.data()).isSameAs(expected);
        verify(privateLeagueService).mine(0, 20);
    }

    @Test
    void leaderboardPageClampsPagingToItsDocumentedBounds() {
        PageResponse<LeaderboardEntryResponse> expected = new PageResponse<>(List.of(), 10_000, 50, 0, 0);
        when(leaderboardService.leaderboardPage("weekly", 10_000, 50)).thenReturn(expected);

        var response = controller.leaderboardPage("weekly", 20_000, 99);

        assertThat(response.data()).isSameAs(expected);
        verify(leaderboardService).leaderboardPage("weekly", 10_000, 50);
    }

    @Test
    void privateLeagueCreateRejectsAMissingRequestIdBeforeCallingTheService() throws Exception {
        mockMvc.perform(post("/predictions/leagues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Friends\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(privateLeagueService);
    }
}
