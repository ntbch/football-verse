package com.footballverse.context.repository;

import com.footballverse.context.model.FootballContext;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FootballContextRepository extends JpaRepository<FootballContext, Long> {
    Optional<FootballContext> findByFixtureId(Long fixtureId);
}
