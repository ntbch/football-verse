package com.footballverse.news.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "key_point_sources")
@IdClass(KeyPointEvidenceId.class)
@Getter
@Setter
@NoArgsConstructor
public class KeyPointEvidence {
    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "key_point_id", nullable = false)
    private StoryKeyPoint keyPoint;

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "raw_item_id", nullable = false)
    private RawItem rawItem;

    @Id
    @Column(name = "evidence_field", nullable = false, length = 40)
    private String evidenceField;

    @Column(nullable = false, length = 20)
    private String relation;
}
