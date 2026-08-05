package com.footballverse.minigame.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "minigame_challenges")
@Getter
@Setter
@NoArgsConstructor
public class MinigameChallenge {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "play_date", nullable = false) private LocalDate playDate;
    @Enumerated(EnumType.STRING) @Column(name = "game_type", nullable = false) private MinigameType gameType;
    @Column(name = "public_payload", nullable = false, columnDefinition = "text") private String publicPayload;
    @Column(name = "answer_payload", nullable = false, columnDefinition = "text") private String answerPayload;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
}
