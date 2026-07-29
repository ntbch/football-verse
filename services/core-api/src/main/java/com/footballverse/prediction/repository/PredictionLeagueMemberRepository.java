package com.footballverse.prediction.repository;

import com.footballverse.prediction.model.PredictionLeagueMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PredictionLeagueMemberRepository extends JpaRepository<PredictionLeagueMember, Long> {
    boolean existsByLeagueIdAndUserId(Long leagueId, Long userId);

    @EntityGraph(attributePaths = "user")
    @Query(value = """
            select member from PredictionLeagueMember member
            join member.user user
            left join PredictionStats stats on stats.user.id = user.id
            where member.league.id = :leagueId
            order by coalesce(stats.totalPoints, 0) desc, user.username asc
            """, countQuery = "select count(member) from PredictionLeagueMember member where member.league.id = :leagueId")
    Page<PredictionLeagueMember> findRankedByLeagueId(@Param("leagueId") Long leagueId, Pageable pageable);
}
