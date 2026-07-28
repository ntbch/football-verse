package com.footballverse.auth.repository;
import com.footballverse.auth.model.RefreshToken;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);

    @Modifying
    @Query("update RefreshToken token set token.revokedAt = :revokedAt where token.user.id = :userId and token.revokedAt is null")
    int revokeActiveByUserId(@Param("userId") Long userId, @Param("revokedAt") Instant revokedAt);
}
