package com.footballverse.game.persistence;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity @Table(name = "fixtures")
public class FixtureEntity {
    @Id private UUID id;
    @Column(nullable = false) private UUID careerSaveId;
    @Column(nullable = false) private UUID homeClubId;
    @Column(nullable = false) private UUID awayClubId;
    @Column(nullable = false) private LocalDate matchDate;
    @Column(nullable = false, length = 30) private String status;
    @Column(nullable = false) private int seasonNumber;
    @Column(nullable = false) private int matchdayNumber;

    protected FixtureEntity() {}
    public FixtureEntity(UUID careerSaveId, UUID homeClubId, UUID awayClubId, LocalDate matchDate) {
        this.id = UUID.randomUUID(); this.careerSaveId = careerSaveId; this.homeClubId = homeClubId;
        this.awayClubId = awayClubId; this.matchDate = matchDate; this.status = "SCHEDULED"; this.seasonNumber = 1; this.matchdayNumber = 1;
    }
    public FixtureEntity(UUID careerSaveId, UUID homeClubId, UUID awayClubId, LocalDate matchDate, int seasonNumber) {
        this(careerSaveId, homeClubId, awayClubId, matchDate);
        this.seasonNumber = seasonNumber;
    }
    public FixtureEntity(UUID careerSaveId, UUID homeClubId, UUID awayClubId, LocalDate matchDate, int seasonNumber, int matchdayNumber) {
        this(careerSaveId, homeClubId, awayClubId, matchDate, seasonNumber);
        this.matchdayNumber = matchdayNumber;
    }
    public UUID getId() { return id; }
    public UUID getCareerSaveId() { return careerSaveId; }
    public UUID getHomeClubId() { return homeClubId; }
    public UUID getAwayClubId() { return awayClubId; }
    public LocalDate getMatchDate() { return matchDate; }
    public String getStatus() { return status; }
    public int getSeasonNumber() { return seasonNumber; }
    public int getMatchdayNumber() { return matchdayNumber; }

    public void markPlayed() {
        if (!"SCHEDULED".equals(status)) {
            throw new IllegalStateException("Fixture is not scheduled");
        }
        this.status = "PLAYED";
    }
}
