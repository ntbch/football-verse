package com.footballverse.game.persistence;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
public interface CareerSaveRepository extends JpaRepository<CareerSaveEntity, UUID> {
    Optional<CareerSaveEntity> findByIdAndOwnerUserId(UUID id, Long ownerUserId);
    List<CareerSaveEntity> findAllByOwnerUserIdOrderByCreatedAtDesc(Long ownerUserId);
}
