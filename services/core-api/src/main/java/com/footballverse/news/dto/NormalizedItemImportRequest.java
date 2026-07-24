package com.footballverse.news.dto;

import com.footballverse.news.model.RawContentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record NormalizedItemImportRequest(
        int schemaVersion,
        @NotBlank @Size(max = 64) String idempotencyKey,
        @NotBlank @Size(max = 2000) String identityKey,
        @NotBlank @Size(max = 64) String revisionFingerprint,
        @NotNull Long connectorId,
        @NotBlank @Size(max = 32) String provider,
        @Size(max = 2000) String externalId,
        @NotNull RawContentType contentType,
        @NotBlank @URL String originalUrl,
        @URL String canonicalUrl,
        @Size(max = 500) String title,
        @Size(max = 5000) String description,
        @Valid Author author,
        List<@Valid Media> media,
        @Size(max = 20) String language,
        Instant publishedAt,
        Instant modifiedAt,
        @NotNull Instant collectedAt,
        Map<String, Long> metrics
) {
    public record Author(
            @NotBlank @Size(max = 200) String name,
            @Size(max = 120) String username
    ) {
    }

    public record Media(
            @NotBlank @Size(max = 20) String type,
            @URL String url,
            @URL String thumbnailUrl,
            @Size(max = 500) String providerMediaId
    ) {
    }
}
