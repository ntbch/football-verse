package com.footballverse.prediction.repository;

import com.footballverse.prediction.model.PredictionLeague;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface PredictionLeagueRepository extends JpaRepository<PredictionLeague, Long> {
    Optional<PredictionLeague> findByInviteCode(String inviteCode);
    boolean existsByInviteCode(String inviteCode);
    long countByOwnerId(Long ownerId);

    @EntityGraph(attributePaths = "owner")
    @Query(value = """
            select league from PredictionLeague league
            where league.id in (select member.league.id from PredictionLeagueMember member where member.user.id = :userId)
            order by league.createdAt desc
            """, countQuery = """
            select count(league) from PredictionLeague league
            where league.id in (select member.league.id from PredictionLeagueMember member where member.user.id = :userId)
            """)
    Page<PredictionLeague> findAllForUser(@Param("userId") Long userId, Pageable pageable);
}
