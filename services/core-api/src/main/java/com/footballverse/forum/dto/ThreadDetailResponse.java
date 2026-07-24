package com.footballverse.forum.dto;

import java.util.List;

public record ThreadDetailResponse(ThreadResponse thread, List<PostResponse> posts) {
}
