package com.footballverse.prediction.repository;
import com.footballverse.prediction.model.Fixture;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FixtureRepository extends JpaRepository<Fixture, Long> {
    Optional<Fixture> findByFixtureId(String fixtureId);
    List<Fixture> findByLeagueSlugAndStatusOrderByKickoffAsc(String leagueSlug, String status);
    List<Fixture> findByStatusAndScoredFalse(String status);
    List<Fixture> findByLeagueSlugOrderByKickoffAsc(String leagueSlug);
    List<Fixture> findByLeagueSlugAndRoundOrderByKickoffAsc(String leagueSlug, String round);
}
