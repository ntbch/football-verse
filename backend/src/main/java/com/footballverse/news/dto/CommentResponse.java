package com.footballverse.news.dto;

import java.time.Instant;

public record CommentResponse(Long id, Long parentId, String author, String content, Instant createdAt) {
}
