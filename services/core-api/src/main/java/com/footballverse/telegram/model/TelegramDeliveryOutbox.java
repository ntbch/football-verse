package com.footballverse.telegram.model;

import com.footballverse.news.model.NewsArticle;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "telegram_delivery_outbox")
@Getter @Setter @NoArgsConstructor
public class TelegramDeliveryOutbox {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "article_id", nullable = false, unique = true)
    private NewsArticle article;
    @Column(nullable = false) private int attempts;
    @Column(name = "next_attempt_at", nullable = false) private Instant nextAttemptAt = Instant.now();
    @Column(name = "sent_at") private Instant sentAt;
    @Column(name = "failed_at") private Instant failedAt;
    @Column(name = "last_error", length = 120) private String lastError;
    public TelegramDeliveryOutbox(NewsArticle article) { this.article = article; }
}
