package com.footballverse.news.model;

import com.footballverse.common.AuditableEntity;
import com.footballverse.user.model.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "news_articles", indexes = {
    @Index(name = "idx_news_articles_status_pub", columnList = "status, published_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
public class NewsArticle extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, unique = true, length = 240)
    private String slug;

    @Column(length = 500)
    private String summary;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_kind", nullable = false, length = 24)
    private NewsContentKind contentKind = NewsContentKind.EDITORIAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ArticleStatus status = ArticleStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private NewsCategory category;

    @ManyToMany
    @JoinTable(
            name = "news_article_tags",
            joinColumns = @JoinColumn(name = "article_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<NewsTag> tags = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id")
    private NewsSource source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private UserAccount author;

    @Column(name = "source_url", unique = true, columnDefinition = "text")
    private String sourceUrl;

    @Column(name = "content_hash", unique = true, length = 64)
    private String contentHash;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", length = 24)
    private VerificationStatus verificationStatus;

    @Column(name = "confidence_score", precision = 5, scale = 4)
    private java.math.BigDecimal confidenceScore;

    @Column(name = "image_url", columnDefinition = "text")
    private String imageUrl;

    @Column(name = "media_type", length = 20)
    private String mediaType;

    @Column(name = "first_source_at")
    private Instant firstSourceAt;

    @Column(name = "last_source_at")
    private Instant lastSourceAt;

    @Column(name = "last_material_change_at")
    private Instant lastMaterialChangeAt;

    @Column(name = "source_count_cached", nullable = false)
    private int sourceCountCached;

    @Column(name = "summary_basis_hash", length = 64)
    private String summaryBasisHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merged_into_id")
    private NewsArticle mergedInto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hero_raw_item_id")
    private RawItem heroRawItem;
}
