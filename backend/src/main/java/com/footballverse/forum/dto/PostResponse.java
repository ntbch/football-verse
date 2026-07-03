package com.footballverse.forum.dto;

import java.time.Instant;

public record PostResponse(Long id, String author, String content, Instant createdAt) {
}
