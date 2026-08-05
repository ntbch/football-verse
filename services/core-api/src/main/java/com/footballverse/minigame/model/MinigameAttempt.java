package com.footballverse.minigame.model;

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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "minigame_attempts")
@Getter
@Setter
@NoArgsConstructor
public class MinigameAttempt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = true) @JoinColumn(name = "user_id") private UserAccount user;
    @Column(name = "guest_token_hash", length = 64) private String guestTokenHash;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "challenge_id", nullable = false) private MinigameChallenge challenge;
    @Column(name = "attempt_key", nullable = false, length = 80) private String attemptKey;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private MinigameAttemptMode mode;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private MinigameAttemptStatus status = MinigameAttemptStatus.ACTIVE;
    @Version private long version;
    @Column(name = "wrong_guesses", nullable = false) private int wrongGuesses;
    @Column(name = "revealed_clues", nullable = false) private int revealedClues;
    @Column(nullable = false) private int score;
    @Column(name = "state_payload", nullable = false, columnDefinition = "text") private String statePayload = "{}";
    @Column(name = "completed_at") private Instant completedAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
}
