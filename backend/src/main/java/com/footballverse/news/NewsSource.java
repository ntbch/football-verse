package com.footballverse.news;

import com.footballverse.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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

    @Column(name = "feed_url", nullable = false, unique = true)
    private String feedUrl;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "last_crawled_at")
    private Instant lastCrawledAt;

    public NewsSource(String name, String feedUrl) {
        this.name = name;
        this.feedUrl = feedUrl;
    }
}
