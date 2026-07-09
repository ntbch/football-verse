package com.footballverse.prediction.repository;
import com.footballverse.prediction.model.Fixture;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface FixtureRepository extends JpaRepository<Fixture, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from Fixture f where f.id = :id")
    Optional<Fixture> findByIdForUpdate(@Param("id") Long id);

    Optional<Fixture> findByFixtureId(String fixtureId);
    List<Fixture> findByLeagueSlugAndStatusOrderByKickoffAsc(String leagueSlug, String status);
    List<Fixture> findByStatusAndScoredFalse(String status);
    List<Fixture> findByLeagueSlugOrderByKickoffAsc(String leagueSlug);
    List<Fixture> findByLeagueSlugAndRoundOrderByKickoffAsc(String leagueSlug, String round);

    @Query("select f from Fixture f where " +
           "(:status is null or f.status = :status) and " +
           "(:leagueSlug is null or f.leagueSlug = :leagueSlug) and " +
           "(:scored is null or f.scored = :scored) " +
           "order by f.kickoff desc")
    org.springframework.data.domain.Page<Fixture> findAdminFixtures(
            @Param("status") String status,
            @Param("leagueSlug") String leagueSlug,
            @Param("scored") Boolean scored,
            org.springframework.data.domain.Pageable pageable);
}
