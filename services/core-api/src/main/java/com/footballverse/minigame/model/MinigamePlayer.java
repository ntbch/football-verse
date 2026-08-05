package com.footballverse.minigame.model;

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
@Table(name = "minigame_players")
@Getter
@Setter
@NoArgsConstructor
public class MinigamePlayer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 32) private String provider;
    @Column(name = "provider_player_id", nullable = false) private long providerPlayerId;
    @Column(nullable = false, length = 160) private String name;
    @Column(name = "normalized_name", nullable = false, length = 180) private String normalizedName;
    @Column(nullable = false, columnDefinition = "text") private String aliases = "[]";
    private String nationality;
    private String position;
    @Column(name = "birth_year") private Integer birthYear;
    @Column(name = "current_club") private String currentClub;
    @Column(name = "current_league") private String currentLeague;
    @Column(name = "career_clubs", nullable = false, columnDefinition = "text") private String careerClubs = "[]";
    @Column(name = "season_label") private String seasonLabel;
    @Column(name = "season_appearances") private Integer seasonAppearances;
    @Column(name = "season_goals") private Integer seasonGoals;
    @Column(name = "season_assists") private Integer seasonAssists;
    @Column(name = "trophy_count", nullable = false) private int trophyCount;
    @Column(name = "refreshed_at", nullable = false) private Instant refreshedAt = Instant.now();
}
