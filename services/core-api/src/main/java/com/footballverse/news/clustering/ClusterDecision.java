package com.footballverse.news.clustering;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "cluster_decisions")
@Getter
@Setter
@NoArgsConstructor
public class ClusterDecision {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "raw_item_id", nullable = false)
    private Long rawItemId;

    @Column(name = "selected_story_id")
    private Long selectedStoryId;

    @Column(name = "action", nullable = false, length = 32)
    private String action;

    @Column(name = "model", length = 160)
    private String model;

    @Column(name = "model_revision", length = 120)
    private String modelRevision;

    @Column(name = "semantic_score", precision = 6, scale = 5)
    private BigDecimal semanticScore;

    @Column(name = "lexical_score", precision = 6, scale = 5)
    private BigDecimal lexicalScore;

    @Column(name = "entity_score", precision = 6, scale = 5)
    private BigDecimal entityScore;

    @Column(name = "time_score", precision = 6, scale = 5)
    private BigDecimal timeScore;

    @Column(name = "final_score", precision = 6, scale = 5)
    private BigDecimal finalScore;

    @Column(name = "reason_code", nullable = false, length = 80)
    private String reasonCode;

    @Column(name = "candidate_snapshot", columnDefinition = "jsonb", nullable = false)
    @org.hibernate.annotations.ColumnTransformer(write = "?::jsonb")
    private String candidateSnapshot = "[]";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
