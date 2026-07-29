package com.footballverse.news.clustering;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "story_cluster_profiles")
@Getter
@Setter
@NoArgsConstructor
public class StoryClusterProfile {
    @Id
    @Column(name = "story_id")
    private Long storyId;

    @Column(name = "model", nullable = false, length = 160)
    private String model;

    @Column(name = "model_revision", nullable = false, length = 120)
    private String modelRevision;

    @Column(name = "member_count", nullable = false)
    private int memberCount;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public StoryClusterProfile(Long storyId, String model, String modelRevision, int memberCount) {
        this.storyId = storyId;
        this.model = model;
        this.modelRevision = modelRevision;
        this.memberCount = memberCount;
        this.updatedAt = Instant.now();
    }
}
