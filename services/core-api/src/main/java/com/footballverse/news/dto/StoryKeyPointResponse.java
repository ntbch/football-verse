package com.footballverse.news.dto;

import java.util.List;

public record StoryKeyPointResponse(
        String text,
        List<StoryKeyPointEvidenceResponse> evidence
) {
}
