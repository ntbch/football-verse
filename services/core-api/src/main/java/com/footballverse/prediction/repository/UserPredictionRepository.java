package com.footballverse.prediction.repository;
import com.footballverse.prediction.model.UserPrediction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
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

    @Query("""
        select p.user.id as userId, sum(p.points) as points,
               sum(case when p.correct = true then 1 else 0 end) as correctPicks
        from UserPrediction p
        where p.fixture.kickoff >= :weekStart
        group by p.user.id
        order by sum(p.points) desc
        """)
    List<WeeklyScore> findWeeklyScores(@Param("weekStart") Instant weekStart, Pageable pageable);

    interface WeeklyScore {
        Long getUserId();
        Long getPoints();
        Long getCorrectPicks();
    }

    long countByUserIdAndCorrect(Long userId, boolean correct);
    long countByUserIdAndFixtureKickoffAfterAndCorrect(Long userId, Instant weekStart, boolean correct);
}
