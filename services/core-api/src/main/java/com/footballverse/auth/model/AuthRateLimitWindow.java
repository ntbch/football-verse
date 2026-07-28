package com.footballverse.auth.model;

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
@Table(name = "auth_rate_limit_windows")
@Getter
@Setter
@NoArgsConstructor
public class AuthRateLimitWindow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 32)
    private String action;

    @Column(name = "identity_hash", nullable = false, length = 64, columnDefinition = "varchar(64)")
    private String identityHash;

    @Column(name = "window_started_at", nullable = false)
    private Instant windowStartedAt;

    @Column(nullable = false)
    private int attempts;

    public AuthRateLimitWindow(String action, String identityHash, Instant windowStartedAt) {
        this.action = action;
        this.identityHash = identityHash;
        this.windowStartedAt = windowStartedAt;
        this.attempts = 0;
    }
}
