package com.footballverse.prediction.dto;
import java.util.List;
public record PrivateLeagueResponse(long id, String name, boolean owner, String inviteCode, int memberCount, List<PrivateLeagueMemberResponse> members) {}
