package com.footballverse.prediction.service;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.prediction.dto.JoinPrivateLeagueRequest;
import com.footballverse.prediction.dto.PrivateLeagueMemberResponse;
import com.footballverse.prediction.dto.PrivateLeagueRequest;
import com.footballverse.prediction.dto.PrivateLeagueResponse;
import com.footballverse.prediction.model.PredictionLeague;
import com.footballverse.prediction.model.PredictionLeagueMember;
import com.footballverse.prediction.model.PredictionStats;
import com.footballverse.prediction.repository.PredictionLeagueMemberRepository;
import com.footballverse.prediction.repository.PredictionLeagueCreateRequestRepository;
import com.footballverse.prediction.repository.PredictionLeagueRepository;
import com.footballverse.prediction.repository.PredictionStatsRepository;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserProfile;
import com.footballverse.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PrivateLeagueService {
    private static final char[] INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();
    private final PredictionLeagueRepository leagues;
    private final PredictionLeagueMemberRepository members;
    private final PredictionLeagueCreateRequestRepository createRequests;
    private final PredictionStatsRepository stats;
    private final UserProfileRepository profiles;
    private final CurrentUser currentUser;

    @Transactional(readOnly = true)
    public PageResponse<PrivateLeagueResponse> mine(int page, int size) {
        UserAccount user = currentUser.get();
        Page<PredictionLeague> leaguesPage = leagues.findAllForUser(user.getId(), PageRequest.of(page, size));
        return PageResponse.from(leaguesPage.map(league -> response(league, user)));
    }

    @Transactional
    public PrivateLeagueResponse create(PrivateLeagueRequest request, UUID requestId) {
        UserAccount user = currentUser.get();
        createRequests.reserve(requestId, user.getId());
        var stored = createRequests.lockByRequestId(requestId).orElseThrow();
        if (!stored.getOwnerId().equals(user.getId())) throw new IllegalArgumentException("Request ID is already used");
        if (stored.getLeague() != null) return response(stored.getLeague(), user);
        PredictionLeague league = leagues.save(new PredictionLeague(user, request.name().trim(), nextInviteCode()));
        members.save(new PredictionLeagueMember(league, user));
        stored.complete(league);
        return response(league, user);
    }

    @Transactional
    public PrivateLeagueResponse join(JoinPrivateLeagueRequest request) {
        UserAccount user = currentUser.get();
        PredictionLeague league = leagues.findByInviteCode(request.inviteCode().trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Invite code not found"));
        if (!members.existsByLeagueIdAndUserId(league.getId(), user.getId())) members.save(new PredictionLeagueMember(league, user));
        return response(league, user);
    }

    private PrivateLeagueResponse response(PredictionLeague league, UserAccount viewer) {
        Page<PredictionLeagueMember> ranked = members.findRankedByLeagueId(league.getId(), PageRequest.of(0, 5));
        boolean owner = league.getOwner().getId().equals(viewer.getId());
        if (ranked.isEmpty()) {
            return new PrivateLeagueResponse(league.getId(), league.getName(), owner, owner ? league.getInviteCode() : null, 0, List.of());
        }
        List<Long> userIds = ranked.getContent().stream().map(member -> member.getUser().getId()).toList();
        Map<Long, PredictionStats> statsByUserId = stats.findByUserIdIn(userIds).stream().collect(Collectors.toMap(item -> item.getUser().getId(), item -> item));
        Map<Long, UserProfile> profilesByUserId = profiles.findByUserIdIn(userIds).stream().collect(Collectors.toMap(item -> item.getUser().getId(), item -> item));
        List<PrivateLeagueMemberResponse> leaderboard = java.util.stream.IntStream.range(0, ranked.getNumberOfElements()).mapToObj(index -> {
            UserAccount user = ranked.getContent().get(index).getUser();
            UserProfile profile = profilesByUserId.get(user.getId());
            PredictionStats userStats = statsByUserId.get(user.getId());
            return new PrivateLeagueMemberResponse(user.getId(), profile == null ? user.getUsername() : profile.getDisplayName(), userStats == null ? 0 : userStats.getTotalPoints(), index + 1);
        }).toList();
        return new PrivateLeagueResponse(league.getId(), league.getName(), owner, owner ? league.getInviteCode() : null, Math.toIntExact(ranked.getTotalElements()), leaderboard);
    }

    private String nextInviteCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            char[] code = new char[8];
            for (int index = 0; index < code.length; index++) code[index] = INVITE_ALPHABET[RANDOM.nextInt(INVITE_ALPHABET.length)];
            String value = new String(code);
            if (!leagues.existsByInviteCode(value)) return value;
        }
        throw new IllegalStateException("Could not allocate invite code");
    }
}
