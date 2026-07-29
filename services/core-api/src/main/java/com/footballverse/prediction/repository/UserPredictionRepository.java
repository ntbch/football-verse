package com.footballverse.prediction.repository;
import com.footballverse.prediction.model.UserPrediction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
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
        select p.user.id as userId, p.user.username as username, sum(p.points) as points,
               sum(case when p.correctOutcome = true then 1 else 0 end) as correctPicks,
               count(p.id) as totalPicks
        from UserPrediction p
        where p.fixture.kickoff >= :periodStart and p.fixture.scored = true
        group by p.user.id, p.user.username
        order by sum(p.points) desc, p.user.id asc
        """)
    Page<PeriodScore> findPeriodScores(@Param("periodStart") Instant periodStart, Pageable pageable);

    @Query("""
        select p.user.id as userId, p.user.username as username, sum(p.points) as points,
               sum(case when p.correctOutcome = true then 1 else 0 end) as correctPicks,
               count(p.id) as totalPicks
        from UserPrediction p
        where p.user.id = :userId and p.fixture.kickoff >= :periodStart and p.fixture.scored = true
        group by p.user.id, p.user.username
        """)
    Optional<PeriodScore> findPeriodScoreForUser(@Param("userId") Long userId, @Param("periodStart") Instant periodStart);

    @Query(value = """
        select count(*) from (
            select p.user_id
            from user_predictions p
            join fixtures f on f.id = p.match_id
            where f.kickoff >= :periodStart and f.scored = true
            group by p.user_id
            having sum(p.points) > :points or (sum(p.points) = :points and p.user_id < :userId)
        ) ranked
        """, nativeQuery = true)
    long countPeriodUsersRankedAhead(
            @Param("periodStart") Instant periodStart,
            @Param("points") Long points,
            @Param("userId") Long userId
    );

    @Query("""
        select p.pick as pick, count(p.id) as count
        from UserPrediction p
        where p.fixture.id = :fixtureId
        group by p.pick
        """)
    List<PickCount> countPicksByFixtureId(@Param("fixtureId") Long fixtureId);

    interface PeriodScore {
        Long getUserId();
        String getUsername();
        Long getPoints();
        Long getCorrectPicks();
        Long getTotalPicks();
    }

    interface PickCount {
        String getPick();
        Long getCount();
    }

    long countByUserIdAndCorrect(Long userId, boolean correct);
    long countByUserIdAndFixtureKickoffAfterAndCorrect(Long userId, Instant weekStart, boolean correct);
}
