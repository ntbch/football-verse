package com.footballverse.auth.repository;

import com.footballverse.auth.model.AuthActionToken;
import com.footballverse.auth.model.AuthTokenPurpose;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AuthActionTokenRepository extends JpaRepository<AuthActionToken, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select token from AuthActionToken token join fetch token.user where token.tokenHash = :hash")
    Optional<AuthActionToken> findByTokenHashForUpdate(@Param("hash") String hash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select token from AuthActionToken token where token.user.id = :userId and token.purpose = :purpose and token.consumedAt is null")
    List<AuthActionToken> findActiveByUserAndPurposeForUpdate(@Param("userId") Long userId, @Param("purpose") AuthTokenPurpose purpose);

    void deleteByExpiresAtBefore(Instant expiresAt);
}
