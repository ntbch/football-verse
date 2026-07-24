package com.footballverse.game.persistence;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CareerOperationRequestRepository extends JpaRepository<CareerOperationRequestEntity, UUID> {
    Optional<CareerOperationRequestEntity> findByRequestIdAndOwnerUserId(UUID requestId, Long ownerUserId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select request from CareerOperationRequestEntity request where request.requestId = :requestId")
    Optional<CareerOperationRequestEntity> lockByRequestId(@Param("requestId") UUID requestId);
}
