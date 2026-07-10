package com.footballverse.game.persistence;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
public interface SimulatedMatchRepository extends JpaRepository<SimulatedMatchEntity, UUID> {
    Optional<SimulatedMatchEntity> findByOwnerUserIdAndIdempotencyKey(Long ownerUserId, String idempotencyKey);
    Optional<SimulatedMatchEntity> findByFixtureIdAndOwnerUserId(UUID fixtureId, Long ownerUserId);
    Optional<SimulatedMatchEntity> findByIdAndCareerSaveIdAndOwnerUserId(UUID id, UUID careerSaveId, Long ownerUserId);
}
