package com.footballverse.game.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity @Table(name = "career_saves")
public class CareerSaveEntity {
    @Id private UUID id;
    @Column(nullable = false) private Long ownerUserId;
    @Column(nullable = false, length = 100) private String name;
    @Column(nullable = false) private LocalDate gameDate;
    @Column(nullable = false, length = 30) private String status;
    @Column(nullable = false) private int seasonNumber;
    @Version private long version;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;

    protected CareerSaveEntity() {}
    public CareerSaveEntity(Long ownerUserId, String name, LocalDate gameDate) {
        this.id = UUID.randomUUID(); this.ownerUserId = ownerUserId; this.name = name;
        this.gameDate = gameDate; this.status = "ACTIVE"; this.seasonNumber = 1;
        this.createdAt = this.updatedAt = Instant.now();
    }
    @PreUpdate void touch() { updatedAt = Instant.now(); }
    public UUID getId() { return id; }
    public Long getOwnerUserId() { return ownerUserId; }
    public String getName() { return name; }
    public LocalDate getGameDate() { return gameDate; }
    public String getStatus() { return status; }
    public int getSeasonNumber() { return seasonNumber; }

    public void advanceDay() {
        this.gameDate = gameDate.plusDays(1);
    }

    public void finishSeason() {
        this.status = "SEASON_FINISHED";
    }

    public void startNextSeason(LocalDate firstFixtureDate) {
        this.seasonNumber++;
        this.gameDate = firstFixtureDate.minusDays(1);
        this.status = "ACTIVE";
    }
}
