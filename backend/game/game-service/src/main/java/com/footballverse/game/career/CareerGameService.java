package com.footballverse.game.career;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.dto.*;
import com.footballverse.game.engine.MatchEngineClient;
import com.footballverse.game.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CareerGameService {
    private static final Position[] FORMATION = {
        Position.GK, Position.LB, Position.CB, Position.CB, Position.RB,
        Position.CM, Position.CM, Position.CM, Position.LW, Position.RW, Position.ST
    };
    private static final Position[] SQUAD_POSITIONS = {
        Position.GK, Position.GK,
        Position.LB, Position.CB, Position.CB, Position.CB, Position.RB,
        Position.CM, Position.CM, Position.CM, Position.DM, Position.AM,
        Position.LW, Position.RW, Position.LM, Position.RM,
        Position.ST, Position.ST
    };
    private static final String[] FIRST_NAMES = {
        "Mateo", "Lucas", "Noah", "Ethan", "Liam", "Milan", "Theo", "Nico", "Leo",
        "Rafael", "Jonas", "Adrian", "Kai", "Owen", "Felix", "Ibrahim", "Marco", "Dario"
    };
    private static final String[] LAST_NAMES = {
        "Silva", "Moreau", "Reed", "Kovac", "Bennett", "Santos", "Novak", "Hayes", "Costa",
        "Mercer", "Larsen", "Diallo", "Rossi", "Ward", "Fischer", "Almeida", "Stone", "Marin"
    };
    private static final String ENGINE_VERSION = "0.1.0";
    private static final String RULESET_VERSION = "1";

    private final CareerSaveRepository careers;
    private final FixtureRepository fixtures;
    private final SimulatedMatchRepository matches;
    private final CareerMatchPersistenceService persistence;
    private final MatchEngineClient engine;
    private final JdbcOperations jdbc;
    private final ObjectMapper json;
    private final ManagerService managers;
    // ponytail: process-local lock fits one game-service instance; use a DB lease before horizontal scaling.
    private final Map<UUID, Object> matchdayLocks = new ConcurrentHashMap<>();

    public CareerGameService(CareerSaveRepository careers, FixtureRepository fixtures,
                             SimulatedMatchRepository matches, CareerMatchPersistenceService persistence,
                             MatchEngineClient engine, JdbcOperations jdbc, ObjectMapper json) {
        this(careers, fixtures, matches, persistence, engine, jdbc, json, null);
    }

    @Autowired
    public CareerGameService(CareerSaveRepository careers, FixtureRepository fixtures,
                             SimulatedMatchRepository matches, CareerMatchPersistenceService persistence,
                             MatchEngineClient engine, JdbcOperations jdbc, ObjectMapper json, ManagerService managers) {
        this.careers = careers;
        this.fixtures = fixtures;
        this.matches = matches;
        this.persistence = persistence;
        this.engine = engine;
        this.jdbc = jdbc;
        this.json = json;
        this.managers = managers;
    }

    @Transactional
    public CareerSaveEntity create(Long ownerUserId, String name) {
        var career = careers.saveAndFlush(new CareerSaveEntity(ownerUserId, name, LocalDate.now()));
        var clubs = List.of(
            seedClub(career.getId(), "Aurora FC", 64, "TIKI_TAKA"),
            seedClub(career.getId(), "Riverside United", 61, "COUNTER_ATTACK"),
            seedClub(career.getId(), "Northbridge City", 62, "GEGENPRESS"),
            seedClub(career.getId(), "Harbor Athletic", 60, "PARK_THE_BUS"),
            seedClub(career.getId(), "Kingsport Rovers", 59, "DIRECT_LONG_BALL"),
            seedClub(career.getId(), "Meadow Park", 58, "WING_PLAY"),
            seedClub(career.getId(), "Stonehaven FC", 63, "BALANCED"),
            seedClub(career.getId(), "Westford Town", 57, "TIKI_TAKA")
        );
        career.setManagedClubId(clubs.getFirst());
        if (managers != null) career.setPlayerManagerId(managers.seed(career, clubs));
        careers.save(career);
        seedFixtures(career.getId(), career.getSeasonNumber(), career.getGameDate().plusDays(1), clubs);
        return career;
    }

    public List<CareerSaveEntity> list(Long ownerUserId) {
        return careers.findAllByOwnerUserIdOrderByCreatedAtDesc(ownerUserId);
    }

    @Transactional
    public CareerSaveEntity rename(Long ownerUserId, UUID careerId, String name) {
        var value = name == null ? "" : name.trim();
        if (value.isEmpty() || value.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Career name is required");
        }
        var career = get(ownerUserId, careerId);
        career.setName(value);
        return careers.save(career);
    }

    @Transactional
    public void delete(Long ownerUserId, UUID careerId) {
        careers.delete(get(ownerUserId, careerId));
    }

    public CareerSaveEntity get(Long ownerUserId, UUID careerId) {
        return careers.findByIdAndOwnerUserId(careerId, ownerUserId).orElseThrow(this::notFound);
    }

    public List<FixtureEntity> fixtures(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        return fixtures.findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(careerId, career.getSeasonNumber());
    }

    @Transactional
    public CareerSaveEntity advanceDay(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        if (!Set.of("ACTIVE", "UNEMPLOYED").contains(career.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Career season is finished");
        }
        var due = fixtures.findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(careerId, career.getSeasonNumber()).stream()
            .anyMatch(fixture -> "SCHEDULED".equals(fixture.getStatus()) && !fixture.getMatchDate().isAfter(career.getGameDate()));
        if (due) throw new ResponseStatusException(HttpStatus.CONFLICT,
            career.getManagedClubId() == null ? "Complete the matchday before advancing" : "Play your fixture before advancing");
        career.advanceDay();
        jdbc.update("UPDATE players SET fitness = LEAST(100, fitness + 12) WHERE career_save_id = ?", careerId);
        applyTraining(career);
        jdbc.update("""
            UPDATE players
            SET availability = 'AVAILABLE', unavailable_until = NULL
            WHERE career_save_id = ? AND unavailable_until <= ?
            """, careerId, career.getGameDate());
        return careers.save(career);
    }

    @Transactional
    public CareerSaveEntity setTrainingFocus(Long ownerUserId, UUID careerId, String focus) {
        var value = focus == null ? "" : focus.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("BALANCED", "FITNESS", "ATTACK", "DEFENSE", "MORALE").contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported training focus");
        }
        var career = get(ownerUserId, careerId);
        career.setTrainingFocus(value);
        return careers.save(career);
    }

    public List<ClubStanding> standings(Long ownerUserId, UUID careerId) {
        return standings(get(ownerUserId, careerId));
    }

    public SeasonSummary seasonSummary(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        return currentSeasonSummary(career);
    }

    public List<SeasonRecord> history(Long ownerUserId, UUID careerId) {
        get(ownerUserId, careerId);
        return seasonRecords(careerId);
    }

    public List<PlayerSeasonStats> playerStats(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        return jdbc.query("""
            SELECT p.id, p.name, c.id AS club_id, c.name AS club_name,
                   (count(mps.id) FILTER (WHERE f.season_number = ?))::int AS appearances,
                   COALESCE(sum((mps.stats->>'minutes')::int) FILTER (WHERE f.season_number = ?), 0)::int AS minutes,
                   COALESCE(sum((mps.stats->>'goals')::int) FILTER (WHERE f.season_number = ?), 0)::int AS goals,
                   COALESCE(sum((mps.stats->>'assists')::int) FILTER (WHERE f.season_number = ?), 0)::int AS assists,
                   COALESCE(avg((mps.stats->>'rating')::numeric) FILTER (WHERE f.season_number = ?), 0)::double precision AS avg_rating
            FROM players p
            JOIN clubs c ON c.id = p.club_id
            LEFT JOIN match_player_stats mps ON mps.player_id = p.id
            LEFT JOIN matches m ON m.id = mps.match_id
            LEFT JOIN fixtures f ON f.id = m.fixture_id
            WHERE p.career_save_id = ?
            GROUP BY p.id, p.name, c.id, c.name
            ORDER BY goals DESC, avg_rating DESC, minutes DESC, p.name
            """, (rs, row) -> new PlayerSeasonStats(
            rs.getObject("id", UUID.class), rs.getString("name"),
            rs.getObject("club_id", UUID.class), rs.getString("club_name"),
            rs.getInt("appearances"), rs.getInt("minutes"), rs.getInt("goals"),
            rs.getInt("assists"), Math.round(rs.getDouble("avg_rating") * 100.0) / 100.0
        ), career.getSeasonNumber(), career.getSeasonNumber(), career.getSeasonNumber(), career.getSeasonNumber(),
            career.getSeasonNumber(), careerId);
    }

    public PageResult<PlayerSeasonStats> playerStatsPage(Long ownerUserId, UUID careerId, int page, int size, String query) {
        var career = get(ownerUserId, careerId);
        page = Math.max(0, page);
        size = Math.max(1, Math.min(100, size));
        var normalized = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        var search = "%" + (normalized.length() < 2 ? "" : normalized) + "%";
        var total = jdbc.queryForObject("""
            SELECT count(*) FROM players p JOIN clubs c ON c.id=p.club_id
            WHERE p.career_save_id=? AND (lower(p.name) LIKE ? OR lower(c.name) LIKE ?)
            """, Long.class, careerId, search, search);
        var items = jdbc.query("""
            SELECT p.id, p.name, c.id AS club_id, c.name AS club_name,
                   (count(mps.id) FILTER (WHERE f.season_number = ?))::int AS appearances,
                   COALESCE(sum((mps.stats->>'minutes')::int) FILTER (WHERE f.season_number = ?), 0)::int AS minutes,
                   COALESCE(sum((mps.stats->>'goals')::int) FILTER (WHERE f.season_number = ?), 0)::int AS goals,
                   COALESCE(sum((mps.stats->>'assists')::int) FILTER (WHERE f.season_number = ?), 0)::int AS assists,
                   COALESCE(avg((mps.stats->>'rating')::numeric) FILTER (WHERE f.season_number = ?), 0)::double precision AS avg_rating
            FROM players p JOIN clubs c ON c.id=p.club_id
            LEFT JOIN match_player_stats mps ON mps.player_id=p.id
            LEFT JOIN matches m ON m.id=mps.match_id LEFT JOIN fixtures f ON f.id=m.fixture_id
            WHERE p.career_save_id=? AND (lower(p.name) LIKE ? OR lower(c.name) LIKE ?)
            GROUP BY p.id, p.name, c.id, c.name
            ORDER BY goals DESC, avg_rating DESC, minutes DESC, p.name, p.id
            LIMIT ? OFFSET ?
            """, (rs, row) -> new PlayerSeasonStats(rs.getObject("id", UUID.class), rs.getString("name"),
            rs.getObject("club_id", UUID.class), rs.getString("club_name"), rs.getInt("appearances"),
            rs.getInt("minutes"), rs.getInt("goals"), rs.getInt("assists"),
            Math.round(rs.getDouble("avg_rating") * 100.0) / 100.0),
            career.getSeasonNumber(), career.getSeasonNumber(), career.getSeasonNumber(), career.getSeasonNumber(),
            career.getSeasonNumber(), careerId, search, search, size, page * size);
        return PageResult.of(items, page, size, total == null ? 0 : total, career.getVersion());
    }

    public TransferMarket transferMarket(Long ownerUserId, UUID careerId, UUID buyerClubId) {
        get(ownerUserId, careerId);
        var balance = clubBalance(careerId, buyerClubId);
        var players = jdbc.query("""
            SELECT p.id, p.name, p.primary_position, p.attributes::text, p.age, c.id AS club_id, c.name AS club_name
            FROM players p JOIN clubs c ON c.id = p.club_id
            WHERE p.career_save_id = ? AND p.club_id <> ?
            ORDER BY c.name, p.name
            LIMIT 40
            """, (rs, row) -> {
            var attributes = readAttributes(rs.getString("attributes"));
            return new TransferCandidate(rs.getObject("id", UUID.class), rs.getString("name"),
                Position.valueOf(rs.getString("primary_position")), rs.getInt("age"),
                rs.getObject("club_id", UUID.class), rs.getString("club_name"), price(attributes));
        }, careerId, buyerClubId);
        return new TransferMarket(buyerClubId, balance, players);
    }

    @Transactional
    public TransferMarket buyPlayer(Long ownerUserId, UUID careerId, UUID buyerClubId, UUID playerId) {
        get(ownerUserId, careerId);
        var row = jdbc.queryForMap("""
            SELECT p.club_id, p.attributes::text
            FROM players p
            WHERE p.id = ? AND p.career_save_id = ?
            """, playerId, careerId);
        var sellerClubId = (UUID) row.get("club_id");
        if (sellerClubId.equals(buyerClubId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Player already belongs to this club");
        }
        var fee = price(readAttributes((String) row.get("attributes")));
        var balance = clubBalance(careerId, buyerClubId);
        if (balance.compareTo(fee) < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Not enough transfer budget");
        }
        jdbc.update("UPDATE clubs SET balance = balance - ? WHERE id = ? AND career_save_id = ?", fee, buyerClubId, careerId);
        jdbc.update("UPDATE clubs SET balance = balance + ? WHERE id = ? AND career_save_id = ?", fee, sellerClubId, careerId);
        jdbc.update("UPDATE players SET club_id = ? WHERE id = ? AND career_save_id = ?", buyerClubId, playerId, careerId);
        return transferMarket(ownerUserId, careerId, buyerClubId);
    }

    @Transactional
    public CareerSaveEntity nextSeason(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        if (!"SEASON_FINISHED".equals(career.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Finish the current season first");
        }
        var firstDate = career.getGameDate().plusDays(1);
        career.startNextSeason(firstDate);
        seedFixtures(careerId, career.getSeasonNumber(), firstDate, clubIds(careerId));
        return careers.save(career);
    }

    private List<ClubStanding> standings(CareerSaveEntity career) {
        var table = new LinkedHashMap<UUID, StandingAccumulator>();
        jdbc.query("SELECT id, name FROM clubs WHERE career_save_id = ? ORDER BY name", (rs, row) -> {
            table.put(rs.getObject("id", UUID.class), new StandingAccumulator(rs.getObject("id", UUID.class), rs.getString("name")));
            return 0;
        }, career.getId());
        var results = jdbc.query("""
            SELECT f.home_club_id, f.away_club_id, m.home_score, m.away_score
            FROM matches m JOIN fixtures f ON f.id = m.fixture_id
            WHERE m.career_save_id = ? AND f.season_number = ? AND m.status = 'COMPLETED'
            """, (rs, row) -> new PlayedScore(
            rs.getObject("home_club_id", UUID.class), rs.getObject("away_club_id", UUID.class),
            rs.getInt("home_score"), rs.getInt("away_score")
        ), career.getId(), career.getSeasonNumber());
        for (var result : results) {
            table.get(result.homeId()).add(result.homeScore(), result.awayScore());
            table.get(result.awayId()).add(result.awayScore(), result.homeScore());
        }
        return table.values().stream().sorted(Comparator
            .comparingInt(StandingAccumulator::points).reversed()
            .thenComparing(Comparator.comparingInt(StandingAccumulator::difference).reversed())
            .thenComparing(Comparator.comparingInt(StandingAccumulator::goalsFor).reversed())
            .thenComparing(StandingAccumulator::name))
            .map(StandingAccumulator::view).toList();
    }

    public PlayedMatchday play(Long ownerUserId, UUID careerId, UUID fixtureId, long seed,
                               Lineup requestedLineup, Tactic requestedTactic) {
        var career = get(ownerUserId, careerId);
        if (!"ACTIVE".equals(career.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Career season is finished");
        }
        var existing = matches.findByFixtureIdAndOwnerUserId(fixtureId, ownerUserId);
        if (existing.isPresent()) {
            var fixture = fixtures.findByIdAndCareerSaveId(fixtureId, careerId).orElseThrow(this::notFound);
            var completion = completeMatchday(ownerUserId, careerId, fixture.getMatchdayNumber());
            return playedMatchday(existing.get(), fixture.getMatchdayNumber(), completion);
        }
        var prepared = prepareFixture(career, fixtureId, seed, requestedLineup, requestedTactic);
        return storePrepared(ownerUserId, prepared, "fixture-" + fixtureId, engine.simulate(prepared.input()));
    }

    public PreparedMatch prepareInteractive(Long ownerUserId, UUID careerId, UUID fixtureId, long seed,
                                            Lineup requestedLineup, Tactic requestedTactic) {
        var career = get(ownerUserId, careerId);
        if (matches.findByFixtureIdAndOwnerUserId(fixtureId, ownerUserId).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Fixture is already played");
        return prepareFixture(career, fixtureId, seed, requestedLineup, requestedTactic);
    }

    @Transactional
    public PlayedMatchday finishInteractive(Long ownerUserId, UUID careerId, UUID fixtureId, MatchInput input,
                                            String idempotencyKey, MatchResult result) {
        get(ownerUserId, careerId);
        var fixture = fixtures.findByIdAndCareerSaveId(fixtureId, careerId).orElseThrow(this::notFound);
        var prepared = new PreparedMatch(careerId, fixture, input);
        return storePrepared(ownerUserId, prepared, idempotencyKey, result);
    }

    private PreparedMatch prepareFixture(CareerSaveEntity career, UUID fixtureId, long seed,
                                         Lineup requestedLineup, Tactic requestedTactic) {
        if (!"ACTIVE".equals(career.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Career season is finished");
        }
        var careerId = career.getId();
        var fixture = fixtures.findByIdAndCareerSaveId(fixtureId, careerId).orElseThrow(this::notFound);
        if (fixture.getMatchDate().isAfter(career.getGameDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Advance the Career date to play this fixture");
        }
        if (!"SCHEDULED".equals(fixture.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Fixture is not scheduled");
        }
        var managedId = career.getManagedClubId();
        if (managedId == null || (!fixture.getHomeClubId().equals(managedId) && !fixture.getAwayClubId().equals(managedId)))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only the managed club fixture can be played");
        var opponentId = fixture.getHomeClubId().equals(managedId) ? fixture.getAwayClubId() : fixture.getHomeClubId();
        var managed = team(managedId, requestedLineup, requestedTactic);
        var opponent = team(opponentId, null, aiTactic(opponentId, managedId, managed.tactic()));
        var input = orderTeams(fixture, managed, opponent, seed);
        return new PreparedMatch(careerId, fixture, input);
    }

    private PlayedMatchday storePrepared(Long ownerUserId, PreparedMatch prepared, String idempotencyKey,
                                         MatchResult result) {
        var career = get(ownerUserId, prepared.careerId());
        var fixture = prepared.fixture();
        var stored = persistence.store(ownerUserId, career.getId(), fixture.getId(), idempotencyKey,
            prepared.input(), result);
        applyAvailabilityEvents(career, result);
        if (managers != null) managers.record(career.getId(), fixture.getHomeClubId(), fixture.getAwayClubId(),
            result.homeScore(), result.awayScore(), career.getGameDate());
        var completion = completeMatchday(ownerUserId, career.getId(), fixture.getMatchdayNumber());
        return playedMatchday(stored, fixture.getMatchdayNumber(), completion);
    }

    public MatchdayCompletion completeMatchday(Long ownerUserId, UUID careerId, int matchdayNumber) {
        synchronized (matchdayLocks.computeIfAbsent(careerId, ignored -> new Object())) {
            return completeMatchdayUnlocked(ownerUserId, careerId, matchdayNumber);
        }
    }

    private MatchdayCompletion completeMatchdayUnlocked(Long ownerUserId, UUID careerId, int matchdayNumber) {
        var career = get(ownerUserId, careerId);
        var seasonFixtures = fixtures.findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(careerId, career.getSeasonNumber());
        if (career.getManagedClubId() != null && seasonFixtures.stream().anyMatch(fixture ->
            fixture.getMatchdayNumber() == matchdayNumber && "SCHEDULED".equals(fixture.getStatus()) &&
                (fixture.getHomeClubId().equals(career.getManagedClubId()) || fixture.getAwayClubId().equals(career.getManagedClubId()))))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Play your fixture before completing the matchday");
        var pending = seasonFixtures.stream()
            .filter(fixture -> fixture.getMatchdayNumber() == matchdayNumber && "SCHEDULED".equals(fixture.getStatus()))
            .filter(fixture -> career.getManagedClubId() == null ||
                (!fixture.getHomeClubId().equals(career.getManagedClubId()) && !fixture.getAwayClubId().equals(career.getManagedClubId())))
            .toList();
        var simulated = new ArrayList<UUID>(); var failed = new ArrayList<UUID>();
        try (var executor = Executors.newFixedThreadPool(3, Thread.ofVirtual().factory())) {
            var jobs = new ArrayList<AiJob>();
            for (var fixture : pending) {
                try {
                    var input = aiInput(career, fixture);
                    jobs.add(new AiJob(fixture, input, CompletableFuture.supplyAsync(() -> engine.simulate(input), executor)));
                } catch (RuntimeException exception) {
                    failed.add(fixture.getId());
                }
            }
            for (var job : jobs) {
                try {
                    var result = job.result().join();
                    var stored = persistence.store(ownerUserId, careerId, job.fixture().getId(),
                        "ai-" + career.getSeasonNumber() + "-" + job.fixture().getId(), job.input(), result);
                    applyAvailabilityEvents(career, result);
                    if (managers != null) managers.record(careerId, job.fixture().getHomeClubId(), job.fixture().getAwayClubId(),
                        result.homeScore(), result.awayScore(), career.getGameDate());
                    simulated.add(stored.getId());
                } catch (RuntimeException exception) {
                    failed.add(job.fixture().getId());
                }
            }
        }
        var complete = fixtures.findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(careerId, career.getSeasonNumber()).stream()
            .filter(fixture -> fixture.getMatchdayNumber() == matchdayNumber).noneMatch(fixture -> "SCHEDULED".equals(fixture.getStatus()));
        if (complete) finishSeasonIfComplete(career);
        return new MatchdayCompletion(matchdayNumber, simulated, failed, complete);
    }

    public void completeDueAiMatchdays(Long ownerUserId, UUID careerId) {
        var career = get(ownerUserId, careerId);
        if (career.getManagedClubId() != null) return;
        fixtures.findAllByCareerSaveIdAndSeasonNumberOrderByMatchDateAsc(careerId, career.getSeasonNumber()).stream()
            .filter(fixture -> "SCHEDULED".equals(fixture.getStatus()) && !fixture.getMatchDate().isAfter(career.getGameDate()))
            .map(FixtureEntity::getMatchdayNumber).distinct().forEach(matchday -> completeMatchday(ownerUserId, careerId, matchday));
    }

    private MatchInput aiInput(CareerSaveEntity career, FixtureEntity fixture) {
        var homeTactic = aiTactic(fixture.getHomeClubId(), fixture.getAwayClubId(), null);
        var home = team(fixture.getHomeClubId(), null, homeTactic);
        var away = team(fixture.getAwayClubId(), null, aiTactic(fixture.getAwayClubId(), fixture.getHomeClubId(), homeTactic));
        return new MatchInput(Integer.toUnsignedLong(Objects.hash(career.getId(), career.getSeasonNumber(), fixture.getId())),
            ENGINE_VERSION, RULESET_VERSION, home, away);
    }

    static MatchInput orderTeams(FixtureEntity fixture, TeamSnapshot managed, TeamSnapshot opponent, long seed) {
        return new MatchInput(seed, ENGINE_VERSION, RULESET_VERSION,
            fixture.getHomeClubId().equals(managed.id()) ? managed : opponent,
            fixture.getAwayClubId().equals(managed.id()) ? managed : opponent);
    }

    public String clubName(UUID clubId) {
        return jdbc.queryForObject("SELECT name FROM clubs WHERE id = ?", String.class, clubId);
    }

    public List<PlayerSnapshot> squad(Long ownerUserId, UUID careerId, UUID clubId) {
        get(ownerUserId, careerId);
        var belongs = jdbc.queryForObject(
            "SELECT count(*) FROM clubs WHERE id = ? AND career_save_id = ?", Integer.class, clubId, careerId);
        if (belongs == null || belongs == 0) {
            throw notFound();
        }
        return players(clubId);
    }

    public JsonNode match(Long ownerUserId, UUID careerId, UUID matchId) {
        get(ownerUserId, careerId);
        return result(matches.findByIdAndCareerSaveIdAndOwnerUserId(matchId, careerId, ownerUserId)
            .orElseThrow(this::notFound));
    }

    public JsonNode events(Long ownerUserId, UUID careerId, UUID matchId) {
        return match(ownerUserId, careerId, matchId).path("events");
    }

    private UUID seedClub(UUID careerId, String name, int rating, String preferredTactic) {
        var clubId = UUID.randomUUID();
        jdbc.update("INSERT INTO clubs (id, career_save_id, name, reputation, preferred_tactic) VALUES (?, ?, ?, ?, ?)",
            clubId, careerId, name, rating, preferredTactic);
        for (int index = 0; index < SQUAD_POSITIONS.length; index++) {
            var position = SQUAD_POSITIONS[index];
            var attributes = attributesFor(position, rating + ((index % 5) - 2));
            jdbc.update("""
                INSERT INTO players (id, career_save_id, club_id, name, primary_position, secondary_positions, attributes, contract_until)
                VALUES (?, ?, ?, ?, ?, CAST(? AS text[]), CAST(? AS jsonb), (SELECT game_date + 730 FROM career_saves WHERE id = ?))
                """, UUID.randomUUID(), careerId, clubId, playerName(name, index),
                position.name(), pgArray(secondaryPositions(position)), write(attributes), careerId);
        }
        return clubId;
    }

    private static String playerName(String clubName, int index) {
        var offset = Math.abs(clubName.hashCode());
        return FIRST_NAMES[(index + offset) % FIRST_NAMES.length] + " "
            + LAST_NAMES[(index * 3 + offset) % LAST_NAMES.length];
    }

    private void seedFixtures(UUID careerId, int seasonNumber, LocalDate startDate, List<UUID> clubs) {
        for (var pairing : schedule(clubs)) {
            fixtures.save(new FixtureEntity(careerId, pairing.home(), pairing.away(),
                startDate.plusWeeks(pairing.matchday() - 1L), seasonNumber, pairing.matchday()));
        }
    }

    static List<ScheduledPair> schedule(List<UUID> clubIds) {
        if (clubIds.size() < 2 || clubIds.size() % 2 != 0) throw new IllegalArgumentException("League needs an even club count");
        var rotation = new ArrayList<>(clubIds);
        var firstLeg = new ArrayList<ScheduledPair>();
        for (int round = 1; round < clubIds.size(); round++) {
            for (int index = 0; index < clubIds.size() / 2; index++) {
                var left = rotation.get(index); var right = rotation.get(clubIds.size() - 1 - index);
                firstLeg.add(round % 2 == 0 ? new ScheduledPair(round, right, left) : new ScheduledPair(round, left, right));
            }
            var moved = rotation.removeLast(); rotation.add(1, moved);
        }
        var schedule = new ArrayList<>(firstLeg);
        firstLeg.forEach(pair -> schedule.add(new ScheduledPair(pair.matchday() + clubIds.size() - 1, pair.away(), pair.home())));
        return schedule;
    }

    private List<UUID> clubIds(UUID careerId) {
        return jdbc.query("SELECT id FROM clubs WHERE career_save_id = ? ORDER BY name",
            (rs, row) -> rs.getObject("id", UUID.class), careerId);
    }

    private void finishSeasonIfComplete(CareerSaveEntity career) {
        var remaining = jdbc.queryForObject("""
            SELECT count(*) FROM fixtures
            WHERE career_save_id = ? AND season_number = ? AND status <> 'PLAYED'
            """, Integer.class, career.getId(), career.getSeasonNumber());
        if (remaining != null && remaining == 0 && currentSeasonSummary(career) == null) {
            var table = standings(career);
            recordSeason(career, table);
            applySeasonRewards(career, table);
            applyPlayerDevelopment(career);
            career.finishSeason();
            careers.save(career);
        }
    }

    private SeasonSummary currentSeasonSummary(CareerSaveEntity career) {
        return seasonRecords(career.getId()).stream()
            .filter(record -> record.seasonNumber() == career.getSeasonNumber())
            .map(record -> new SeasonSummary(record.seasonNumber(), record.championClubId(),
                record.championClubName(), record.finalTable()))
            .findFirst()
            .orElse(null);
    }

    private void recordSeason(CareerSaveEntity career, List<ClubStanding> table) {
        if (table.isEmpty() || currentSeasonSummary(career) != null) {
            return;
        }
        var champion = table.get(0);
        jdbc.update("""
            INSERT INTO season_records
                (id, career_save_id, season_number, champion_club_id, champion_club_name, final_table)
            VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
            ON CONFLICT (career_save_id, season_number) DO NOTHING
            """, UUID.randomUUID(), career.getId(), career.getSeasonNumber(),
            champion.clubId(), champion.clubName(), write(table));
    }

    private List<SeasonRecord> seasonRecords(UUID careerId) {
        return jdbc.query("""
            SELECT season_number, champion_club_id, champion_club_name, final_table::text
            FROM season_records
            WHERE career_save_id = ?
            ORDER BY season_number DESC
            """, (rs, row) -> new SeasonRecord(
            rs.getInt("season_number"),
            rs.getObject("champion_club_id", UUID.class),
            rs.getString("champion_club_name"),
            readTable(rs.getString("final_table"))
        ), careerId);
    }

    private TeamSnapshot team(UUID clubId, Lineup requestedLineup, Tactic requestedTactic) {
        var name = jdbc.queryForObject("SELECT name FROM clubs WHERE id = ?", String.class, clubId);
        var players = players(clubId);
        var lineup = requestedLineup == null ? (managers == null ? defaultLineup(players) : managers.lineup(clubId, players)) : requestedLineup;
        var tactic = requestedTactic == null ? defaultTactic() : requestedTactic;
        return new TeamSnapshot(clubId, name, players, lineup, tactic, managers == null ? null : managers.plan(clubId));
    }

    private Tactic aiTactic(UUID clubId, UUID opponentId, Tactic opponentTactic) {
        var club = jdbc.queryForMap("SELECT preferred_tactic, reputation FROM clubs WHERE id = ?", clubId);
        var opponentStrength = jdbc.queryForObject("SELECT reputation FROM clubs WHERE id = ?", Integer.class, opponentId);
        var condition = jdbc.queryForMap("""
            SELECT COALESCE(avg(fitness), 100) fitness, COALESCE(avg(form), 50) form,
                   count(*) FILTER (WHERE availability <> 'AVAILABLE') unavailable
            FROM players WHERE club_id = ?
            """, clubId);
        var difference = ((Number) club.get("reputation")).intValue() - opponentStrength;
        if (managers != null) return managers.tactic(clubId, difference,
            ((Number) condition.get("fitness")).doubleValue(), ((Number) condition.get("form")).doubleValue(),
            ((Number) condition.get("unavailable")).longValue(), opponentTactic);
        return TacticPresets.get(TacticPresets.choose((String) club.get("preferred_tactic"), difference,
            ((Number) condition.get("fitness")).doubleValue(), ((Number) condition.get("form")).doubleValue(),
            ((Number) condition.get("unavailable")).longValue(), opponentTactic));
    }

    private List<PlayerSnapshot> players(UUID clubId) {
        return jdbc.query("""
            SELECT id, name, primary_position, secondary_positions, attributes::text, age, availability, fitness, morale, form
            FROM players WHERE club_id = ? ORDER BY name
            """, (rs, row) -> new PlayerSnapshot(
            rs.getObject("id", UUID.class), rs.getString("name"), Position.valueOf(rs.getString("primary_position")),
            Arrays.stream((String[]) rs.getArray("secondary_positions").getArray()).map(Position::valueOf).collect(java.util.stream.Collectors.toSet()),
            readAttributes(rs.getString("attributes")), rs.getInt("age"), PlayerAvailability.valueOf(rs.getString("availability")),
            rs.getDouble("fitness"), rs.getDouble("morale"), rs.getDouble("form")
        ), clubId);
    }

    private static Set<Position> secondaryPositions(Position position) { return switch (position) {
        case LB -> Set.of(Position.LWB); case RB -> Set.of(Position.RWB); case LWB -> Set.of(Position.LB, Position.LM);
        case RWB -> Set.of(Position.RB, Position.RM); case DM -> Set.of(Position.CM); case CM -> Set.of(Position.DM, Position.AM);
        case AM -> Set.of(Position.CM); case LM -> Set.of(Position.LW); case RM -> Set.of(Position.RW);
        case LW -> Set.of(Position.LM, Position.ST); case RW -> Set.of(Position.RM, Position.ST); default -> Set.of();
    }; }
    private static String pgArray(Set<Position> positions) { return "{" + positions.stream().map(Position::name).sorted().collect(java.util.stream.Collectors.joining(",")) + "}"; }

    private Lineup defaultLineup(List<PlayerSnapshot> players) {
        var available = players.stream().filter(player -> player.availability() == PlayerAvailability.AVAILABLE).toList();
        var selected = new ArrayList<PlayerSnapshot>();
        var starters = new ArrayList<LineupSlot>();
        for (var position : FORMATION) {
            var player = pickForPosition(available, selected, position);
            selected.add(player);
            starters.add(new LineupSlot(player.id(), position, role(position)));
        }
        var starterIds = selected.stream().map(PlayerSnapshot::id).collect(java.util.stream.Collectors.toSet());
        var bench = available.stream().map(PlayerSnapshot::id).filter(id -> !starterIds.contains(id)).limit(7).toList();
        return new Lineup(Formation.FOUR_THREE_THREE, starters, bench);
    }

    private PlayerSnapshot pickForPosition(List<PlayerSnapshot> players, List<PlayerSnapshot> selected, Position position) {
        return players.stream()
            .filter(player -> !selected.contains(player))
            .filter(player -> player.primaryPosition() == position)
            .findFirst()
            .orElseGet(() -> players.stream().filter(player -> !selected.contains(player)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Not enough available players")));
    }

    private Tactic defaultTactic() {
        return TacticPresets.get("BALANCED");
    }

    private static PlayerRole role(Position position) {
        return switch (position) {
            case GK -> PlayerRole.GOALKEEPER;
            case LB, RB -> PlayerRole.FULL_BACK;
            case CB -> PlayerRole.CENTRAL_DEFENDER;
            case CM, DM, AM -> PlayerRole.CENTRAL_MIDFIELDER;
            case LW, RW, LM, RM -> PlayerRole.WINGER;
            case ST -> PlayerRole.POACHER;
            default -> throw new IllegalArgumentException("Unsupported seeded position: " + position);
        };
    }

    private PlayerAttributes attributesFor(Position position, int rating) {
        var r = Math.max(1, Math.min(100, rating));
        return switch (position) {
            case GK -> new PlayerAttributes(r - 8, r - 8, r - 8, r - 6, r - 15, r, r, r, r + 2, r, r,
                r, r - 8, r, r + 10, r + 10, r + 10, r + 8);
            case CB, LB, RB, LWB, RWB -> new PlayerAttributes(r, r, r - 2, r + 8, r - 8, r, r + 5, r + 5,
                r + 5, r, r + 8, r, r + 4, r, r - 20, r - 20, r - 20, r - 10);
            case DM, CM, AM, LM, RM -> new PlayerAttributes(r + 6, r + 5, r + 4, r, r, r, r, r + 4, r - 2,
                r + 6, r + 4, r + 4, r, r + 5, r - 20, r - 20, r - 20, r - 10);
            default -> new PlayerAttributes(r, r + 4, r + 5, r - 6, r + 8, r + 4, r, r, r,
                r, r, r + 6, r, r, r - 20, r - 20, r - 20, r - 10);
        };
    }

    private void applyAvailabilityEvents(CareerSaveEntity career, MatchResult result) {
        for (var event : result.events()) {
            if (event.playerId() == null || event.type() == EventType.SUBSTITUTION) {
                continue;
            }
            if (event.type() == EventType.INJURY) {
                var days = ((Number) event.payload().getOrDefault("days", 3)).intValue();
                setUnavailable(career, event.playerId(), PlayerAvailability.INJURED, days);
            } else if (event.type() == EventType.RED_CARD) {
                setUnavailable(career, event.playerId(), PlayerAvailability.SUSPENDED, 1);
            }
        }
    }

    private void setUnavailable(CareerSaveEntity career, UUID playerId, PlayerAvailability availability, int days) {
        jdbc.update("""
            UPDATE players
            SET availability = ?, unavailable_until = ?
            WHERE id = ? AND career_save_id = ?
            """, availability.name(), career.getGameDate().plusDays(days), playerId, career.getId());
    }

    private void applyTraining(CareerSaveEntity career) {
        switch (career.getTrainingFocus()) {
            case "FITNESS" -> jdbc.update("UPDATE players SET fitness = LEAST(100, fitness + 5) WHERE career_save_id = ?", career.getId());
            case "MORALE" -> jdbc.update("UPDATE players SET morale = LEAST(100, morale + 3) WHERE career_save_id = ?", career.getId());
            case "ATTACK", "DEFENSE" -> jdbc.update("UPDATE players SET form = LEAST(100, form + 1) WHERE career_save_id = ?", career.getId());
            default -> { }
        }
    }

    private void applySeasonRewards(CareerSaveEntity career, List<ClubStanding> table) {
        for (int index = 0; index < table.size(); index++) {
            var standing = table.get(index);
            var reward = BigDecimal.valueOf(1_000_000L + standing.points() * 100_000L + (long) (table.size() - index) * 250_000L);
            jdbc.update("UPDATE clubs SET balance = balance + ? WHERE id = ? AND career_save_id = ?",
                reward, standing.clubId(), career.getId());
        }
    }

    private void applyPlayerDevelopment(CareerSaveEntity career) {
        jdbc.query("""
            SELECT p.id, p.attributes::text, p.form, p.age,
                   COALESCE(sum((mps.stats->>'minutes')::int) FILTER (WHERE f.season_number = ?), 0)::int AS minutes
            FROM players p
            LEFT JOIN match_player_stats mps ON mps.player_id = p.id
            LEFT JOIN matches m ON m.id = mps.match_id
            LEFT JOIN fixtures f ON f.id = m.fixture_id
            WHERE p.career_save_id = ?
            GROUP BY p.id, p.attributes, p.form, p.age
            """, rs -> {
            var minutes = rs.getInt("minutes");
            var form = rs.getDouble("form");
            var age = rs.getInt("age");
            var delta = (minutes >= 180 || form >= 65) ? 1 : form < 40 ? -1 : 0;
            if (age >= 32) delta--;
            var updated = adjust(readAttributes(rs.getString("attributes")), delta);
            jdbc.update("""
                UPDATE players
                SET attributes = CAST(? AS jsonb), age = age + 1, form = 50
                WHERE id = ? AND career_save_id = ?
                """, write(updated), rs.getObject("id", UUID.class), career.getId());
        }, career.getSeasonNumber(), career.getId());
    }

    private BigDecimal clubBalance(UUID careerId, UUID clubId) {
        var balance = jdbc.queryForObject("SELECT balance FROM clubs WHERE id = ? AND career_save_id = ?",
            BigDecimal.class, clubId, careerId);
        if (balance == null) throw notFound();
        return balance;
    }

    private BigDecimal price(PlayerAttributes attributes) {
        return BigDecimal.valueOf((long) average(attributes) * 50_000L);
    }

    private int average(PlayerAttributes attributes) {
        return (attributes.passing() + attributes.firstTouch() + attributes.dribbling() + attributes.tackling()
            + attributes.finishing() + attributes.pace() + attributes.strength() + attributes.stamina()
            + attributes.aerial() + attributes.decisions() + attributes.positioning() + attributes.composure()
            + attributes.aggression() + attributes.teamwork() + attributes.handling() + attributes.reflexes()
            + attributes.oneOnOne() + attributes.distribution()) / 18;
    }

    private PlayerAttributes adjust(PlayerAttributes a, int delta) {
        return new PlayerAttributes(clamp(a.passing() + delta), clamp(a.firstTouch() + delta), clamp(a.dribbling() + delta),
            clamp(a.tackling() + delta), clamp(a.finishing() + delta), clamp(a.pace() + delta), clamp(a.strength() + delta),
            clamp(a.stamina() + delta), clamp(a.aerial() + delta), clamp(a.decisions() + delta), clamp(a.positioning() + delta),
            clamp(a.composure() + delta), clamp(a.aggression() + delta), clamp(a.teamwork() + delta), clamp(a.handling() + delta),
            clamp(a.reflexes() + delta), clamp(a.oneOnOne() + delta), clamp(a.distribution() + delta));
    }

    private int clamp(int value) {
        return Math.max(1, Math.min(100, value));
    }

    private JsonNode result(SimulatedMatchEntity match) {
        if (match.getResultSnapshot() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Match is not completed");
        }
        try {
            return json.readTree(match.getResultSnapshot());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored match result is invalid", exception);
        }
    }

    private PlayedMatch played(SimulatedMatchEntity match) {
        return new PlayedMatch(match.getId(), result(match));
    }

    private PlayedMatchday playedMatchday(SimulatedMatchEntity match, int matchday, MatchdayCompletion completion) {
        return new PlayedMatchday(match.getId(), result(match), matchday, completion.simulatedMatchIds(),
            completion.failedFixtureIds(), completion.complete());
    }

    private PlayerAttributes readAttributes(String value) {
        try {
            return json.readValue(value, PlayerAttributes.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored player attributes are invalid", exception);
        }
    }

    private List<ClubStanding> readTable(String value) {
        try {
            return json.readValue(value, json.getTypeFactory().constructCollectionType(List.class, ClubStanding.class));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored season table is invalid", exception);
        }
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Career seed cannot be serialized", exception);
        }
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Career resource not found");
    }

    public record PlayedMatch(UUID matchId, JsonNode result) {}
    public record PreparedMatch(UUID careerId, FixtureEntity fixture, MatchInput input) {}
    public record PlayedMatchday(UUID matchId, JsonNode result, int matchdayNumber, List<UUID> simulatedAiMatchIds,
                                 List<UUID> failedFixtureIds, boolean matchdayComplete) {}
    public record MatchdayCompletion(int matchdayNumber, List<UUID> simulatedMatchIds, List<UUID> failedFixtureIds, boolean complete) {}
    public record ClubStanding(UUID clubId, String clubName, int played, int wins, int draws, int losses,
                               int goalsFor, int goalsAgainst, int goalDifference, int points) {}
    public record SeasonSummary(int seasonNumber, UUID championClubId, String championClubName,
                                List<ClubStanding> finalTable) {}
    public record SeasonRecord(int seasonNumber, UUID championClubId, String championClubName,
                               List<ClubStanding> finalTable) {}
    public record PlayerSeasonStats(UUID playerId, String playerName, UUID clubId, String clubName,
                                    int appearances, int minutes, int goals, int assists, double averageRating) {}
    public record TransferCandidate(UUID playerId, String playerName, Position position, int age,
                                    UUID clubId, String clubName, BigDecimal price) {}
    public record TransferMarket(UUID clubId, BigDecimal balance, List<TransferCandidate> players) {}

    private record PlayedScore(UUID homeId, UUID awayId, int homeScore, int awayScore) {}
    record ScheduledPair(int matchday, UUID home, UUID away) {}
    private record AiJob(FixtureEntity fixture, MatchInput input, CompletableFuture<MatchResult> result) {}

    private static final class StandingAccumulator {
        private final UUID id;
        private final String name;
        private int played;
        private int wins;
        private int draws;
        private int losses;
        private int goalsFor;
        private int goalsAgainst;

        private StandingAccumulator(UUID id, String name) { this.id = id; this.name = name; }
        private void add(int scored, int conceded) {
            played++; goalsFor += scored; goalsAgainst += conceded;
            if (scored > conceded) wins++; else if (scored < conceded) losses++; else draws++;
        }
        private int points() { return wins * 3 + draws; }
        private int difference() { return goalsFor - goalsAgainst; }
        private int goalsFor() { return goalsFor; }
        private String name() { return name; }
        private ClubStanding view() { return new ClubStanding(id, name, played, wins, draws, losses, goalsFor, goalsAgainst, difference(), points()); }
    }
}
