package com.footballverse.context;

import com.footballverse.context.model.FootballContext;
import com.footballverse.context.repository.FootballContextRepository;
import com.footballverse.prediction.model.Fixture;
import com.footballverse.prediction.repository.FixtureRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class FootballContextRepositoryTest {

    @Autowired
    private FixtureRepository fixtures;

    @Autowired
    private FootballContextRepository contexts;

    @Test
    void storesAndFindsTheCanonicalContextForAFixture() {
        Fixture fixture = new Fixture();
        fixture.setFixtureId("provider-fixture-123");
        fixture.setLeagueSlug("premier-league");
        fixture.setHomeTeam("Manchester City");
        fixture.setAwayTeam("Arsenal");
        fixture.setKickoff(Instant.parse("2026-08-16T14:00:00Z"));
        fixture = fixtures.saveAndFlush(fixture);

        FootballContext saved = contexts.saveAndFlush(
                FootballContext.fixture(fixture, "Manchester City vs Arsenal")
        );

        assertThat(contexts.findByFixtureId(fixture.getId())).contains(saved);
        assertThat(saved.getContextKey()).isEqualTo("provider-fixture-123");
    }
}
