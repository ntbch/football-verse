package com.footballverse.game.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.footballverse.game.career.CareerGameService;
import com.footballverse.game.career.InteractiveMatchService;
import com.footballverse.game.dto.Lineup;
import com.footballverse.game.dto.Tactic;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class CareerController {

    public record CreateSaveRequest(@NotBlank @Size(max = 100) String name) {}
    public record RenameSaveRequest(@NotBlank @Size(max = 100) String name) {}
    public record TrainingFocusRequest(String focus) {}
    public record OfferRequest(UUID playerId, BigDecimal fee) {}
    public record OfferResponse(String action, BigDecimal fee) {}
    public record TermsRequest(BigDecimal wage, int contractYears, String squadRole) {}
    public record TransferStatusRequest(String status) {}
    public record PlayFixtureRequest(Long seed, Lineup homeLineup, Tactic homeTactic) {}
    public record StartMatchSessionRequest(UUID requestId, Long seed, Lineup lineup, Tactic tactic) {}
    public record MatchSessionAction(UUID requestId, Long expectedVersion) {}
    public record MatchSessionCommand(UUID requestId, Long expectedVersion, String type, Tactic tactic, Lineup lineup,
                                      String shout, UUID outgoingPlayerId, UUID incomingPlayerId,
                                      List<InteractiveMatchService.Substitution> substitutions) {}
    public record MatchSessionConflictResponse(String message, InteractiveMatchService.Snapshot session) {}
    public record SaveResponse(UUID id, String name, LocalDate gameDate, String status, int seasonNumber,
                               String trainingFocus, UUID managedClubId, UUID playerManagerId) {}
    public record FixtureResponse(UUID id, UUID homeClubId, String homeClubName, UUID awayClubId,
                                  String awayClubName, LocalDate matchDate, String status, int matchdayNumber) {}
    public record SaveDetailsResponse(SaveResponse save, List<FixtureResponse> fixtures,
                                      CareerGameService.SeasonSummary seasonSummary,
                                      List<CareerGameService.SeasonRecord> history) {}
    public record PlayResponse(UUID matchId, JsonNode result, int matchdayNumber, List<UUID> simulatedAiMatchIds,
                               List<UUID> failedFixtureIds, boolean matchdayComplete) {}
}
