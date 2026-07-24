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
@Table(name = "news_sources")
@Getter
@Setter
@NoArgsConstructor
public class NewsSource extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(name = "feed_url", unique = true, columnDefinition = "text")
    private String feedUrl;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "auto_publish", nullable = false)
    private boolean autoPublish;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 12)
    private NewsSourceType sourceType = NewsSourceType.RSS;

    @Column(name = "css_selector", length = 255)
    private String cssSelector;

    @Column(name = "last_crawled_at")
    private Instant lastCrawledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publisher_id")
    private Publisher publisher;

    @Column(nullable = false, length = 32)
    private String provider = "rss";

    @Column(name = "config_version", nullable = false)
    private int configVersion = 1;

    @Column(name = "credential_ref", length = 120)
    private String credentialRef;

    @Column(name = "fetch_interval_seconds", nullable = false)
    private int fetchIntervalSeconds = 900;

    public NewsSource(String name, String feedUrl) {
        this.name = name;
        this.feedUrl = feedUrl;
    }
}
