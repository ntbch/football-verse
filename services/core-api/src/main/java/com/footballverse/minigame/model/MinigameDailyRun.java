package com.footballverse.minigame.model;

import com.footballverse.user.model.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "minigame_daily_runs")
@Getter
@Setter
@NoArgsConstructor
public class MinigameDailyRun {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "play_date", nullable = false) private LocalDate playDate;
    @ManyToOne(fetch = FetchType.LAZY, optional = true) @JoinColumn(name = "user_id") private UserAccount user;
    @Column(name = "guest_token_hash", length = 64) private String guestTokenHash;
    @ManyToOne(fetch = FetchType.LAZY, optional = true) @JoinColumn(name = "who_am_i_attempt_id") private MinigameAttempt whoAmIAttempt;
    @ManyToOne(fetch = FetchType.LAZY, optional = true) @JoinColumn(name = "grid_attempt_id") private MinigameAttempt gridAttempt;
    @Column(name = "started_at", nullable = false) private Instant startedAt = Instant.now();
    @Column(name = "deadline_at") private Instant deadlineAt;
    @Column(name = "completed_at") private Instant completedAt;
    @Column(nullable = false, length = 20) private String status = "ACTIVE";
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
}
