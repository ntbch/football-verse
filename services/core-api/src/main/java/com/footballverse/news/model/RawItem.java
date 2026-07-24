package com.footballverse.news.model;

import com.footballverse.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "raw_items")
@Getter
@Setter
@NoArgsConstructor
public class RawItem extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publisher_id")
    private Publisher publisher;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "connector_id", nullable = false)
    private NewsSource connector;

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(name = "external_id", columnDefinition = "text")
    private String externalId;

    @Column(name = "identity_key", nullable = false, unique = true, columnDefinition = "text")
    private String identityKey;

    @Column(name = "revision_fingerprint", nullable = false, length = 64)
    private String revisionFingerprint;

    @Column(name = "original_url", nullable = false, columnDefinition = "text")
    private String originalUrl;

    @Column(name = "canonical_url", columnDefinition = "text")
    private String canonicalUrl;

    @Column(name = "canonical_url_hash", length = 64)
    private String canonicalUrlHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false, length = 20)
    private RawContentType contentType;

    @Column(length = 500)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "author_name", length = 200)
    private String authorName;

    @Column(name = "author_username", length = 120)
    private String authorUsername;

    @Column(name = "image_url", columnDefinition = "text")
    private String imageUrl;

    @Column(name = "embed_url", columnDefinition = "text")
    private String embedUrl;

    @Column(length = 20)
    private String language;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "modified_at")
    private Instant modifiedAt;

    @Column(name = "discovered_at", nullable = false)
    private Instant discoveredAt;

    @Column(name = "payload_version", nullable = false)
    private int payloadVersion;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";
}
