package com.footballverse.prediction.repository;

import com.footballverse.prediction.model.PredictionLeagueCreateRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PredictionLeagueCreateRequestRepository extends JpaRepository<PredictionLeagueCreateRequest, UUID> {
    @Modifying
    @Query(value = """
            insert into prediction_league_create_requests (request_id, owner_id, state, created_at, updated_at)
            values (:requestId, :ownerId, 'PENDING', current_timestamp, current_timestamp)
            on conflict (request_id) do nothing
            """, nativeQuery = true)
    int reserve(@Param("requestId") UUID requestId, @Param("ownerId") Long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select request from PredictionLeagueCreateRequest request left join fetch request.league where request.requestId = :requestId")
    Optional<PredictionLeagueCreateRequest> lockByRequestId(@Param("requestId") UUID requestId);
}
