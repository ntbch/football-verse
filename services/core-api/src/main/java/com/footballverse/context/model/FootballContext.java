package com.footballverse.context.model;

import com.footballverse.prediction.model.Fixture;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Objects;

@Entity
@Table(
        name = "football_contexts",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_football_contexts_type_key",
                columnNames = {"type", "context_key"}
        )
)
@Getter
@NoArgsConstructor
public class FootballContext {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private FootballContextType type;

    @Column(name = "context_key", nullable = false, length = 160)
    private String contextKey;

    @Column(name = "display_name", nullable = false, length = 180)
    private String displayName;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fixture_id", unique = true)
    private Fixture fixture;

    public static FootballContext fixture(Fixture fixture, String displayName) {
        FootballContext context = new FootballContext();
        context.type = FootballContextType.FIXTURE;
        context.fixture = Objects.requireNonNull(fixture, "fixture");
        context.contextKey = fixture.getFixtureId();
        context.displayName = Objects.requireNonNull(displayName, "displayName");
        return context;
    }
}
