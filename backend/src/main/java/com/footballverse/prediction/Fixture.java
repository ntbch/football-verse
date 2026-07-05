package com.footballverse.prediction;

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
@Table(name = "fixtures")
@Getter
@Setter
@NoArgsConstructor
public class Fixture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fixture_id", nullable = false, length = 60)
    private String fixtureId;

    @Column(name = "league_slug", nullable = false, length = 60)
    private String leagueSlug;

    @Column(length = 120)
    private String round;

    @Column(name = "home_team", nullable = false, length = 120)
    private String homeTeam;

    @Column(name = "away_team", nullable = false, length = 120)
    private String awayTeam;

    @Column(nullable = false)
    private Instant kickoff;

    @Column(name = "home_score")
    private Integer homeScore;

    @Column(name = "away_score")
    private Integer awayScore;

    @Column(nullable = false, length = 20)
    private String status = "upcoming";

    @Column(nullable = false)
    private boolean scored = false;

    @jakarta.persistence.Version
    private long version;
}
