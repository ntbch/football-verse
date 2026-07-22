package com.footballverse.game.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface MatchSessionRequestRepository extends JpaRepository<MatchSessionRequestEntity, UUID> {
    @Query(value = "SELECT :lockKey FROM pg_advisory_xact_lock(:lockKey)", nativeQuery = true)
    Long lockRequest(@Param("lockKey") long lockKey);
    Optional<MatchSessionRequestEntity> findByRequestIdAndOwnerUserId(UUID requestId, Long ownerUserId);
}
