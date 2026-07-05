package com.footballverse.prediction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserPredictionRepository extends JpaRepository<UserPrediction, Long> {
    Optional<UserPrediction> findByUserIdAndFixtureId(Long userId, Long fixtureId);
    List<UserPrediction> findByUserIdAndFixtureLeagueSlug(Long userId, String leagueSlug);
    List<UserPrediction> findByFixtureId(Long fixtureId);
    List<UserPrediction> findByUserIdAndFixtureIdIn(Long userId, Collection<Long> fixtureIds);
    @Query("""
        select p from UserPrediction p
        join fetch p.fixture f
        left join fetch p.user
        where f.kickoff >= :weekStart
        """)
    List<UserPrediction> findByFixtureKickoffAfter(@Param("weekStart") Instant weekStart);
    long countByUserIdAndCorrect(Long userId, boolean correct);
    long countByUserIdAndFixtureKickoffAfterAndCorrect(Long userId, Instant weekStart, boolean correct);
}
