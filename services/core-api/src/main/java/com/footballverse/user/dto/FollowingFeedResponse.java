package com.footballverse.user.dto;

import java.util.List;

public record FollowingFeedResponse(
        List<FollowTargetResponse> follows,
        List<FollowingFeedItemResponse> items
) {}
