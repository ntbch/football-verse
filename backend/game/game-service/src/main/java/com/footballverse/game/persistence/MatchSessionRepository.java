package com.footballverse.game.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;
import java.time.Instant;
import java.util.UUID;

public interface MatchSessionRepository extends JpaRepository<MatchSessionEntity, UUID> {
    Optional<MatchSessionEntity> findByOwnerUserIdAndRequestId(Long ownerUserId, UUID requestId);
    Optional<MatchSessionEntity> findByIdAndCareerSaveIdAndOwnerUserId(UUID id, UUID careerSaveId, Long ownerUserId);
    Optional<MatchSessionEntity> findByCareerSaveIdAndOwnerUserIdAndStatus(UUID careerSaveId, Long ownerUserId, String status);
    long deleteByStatusInAndUpdatedAtBefore(List<String> statuses, Instant cutoff);
}
