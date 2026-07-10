package com.footballverse.game.persistence;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
public interface FixtureRepository extends JpaRepository<FixtureEntity, UUID> {
    Optional<FixtureEntity> findByIdAndCareerSaveId(UUID id, UUID careerSaveId);
    List<FixtureEntity> findAllByCareerSaveIdOrderByMatchDateAsc(UUID careerSaveId);
    List<FixtureEntity> findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(UUID careerSaveId, int seasonNumber);
}
