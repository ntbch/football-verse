# Match Engine Implementation Plan — Phase 0–3

**Status:** Ready for implementation  
**Design:** [football-manager-match-game-design.md](./football-manager-match-game-design.md)

## Approach

Create a new `match-engine` Python service. `prediction-service` remains untouched
and continues owning real fixture, standings, and prediction-provider data. Change
only the gateway's `/game/*` upstream; `/matches/*` and `/standings/*` continue to
use `prediction-service`.

`game-service` owns the separate PostgreSQL instance/database and volume named
`match_game_db`. Python Match Engine remains pure and stateless. Game Service calls
it internally, persists results, and exposes authenticated `/game/*` APIs.

## Scope

- In:
  - Phase 0 service/database foundation.
  - Phase 1 deterministic possession-zone-duel engine.
  - Phase 2 minimal Career save, fixture API, and match persistence.
  - Phase 3 Match Centre frontend.
  - Focused tests, balance runner, API documentation, and smoke checks.
- Out:
  - Career saves and advancing game time.
  - Transfers, contracts, training, progression, and finances.
  - Interactive pause/commands and substitutions.
  - 2D pitch, PvP, online league, Redis jobs, and message broker.

## Action items

### Phase 0 — foundation

- [x] **M01 — Add isolated game database infrastructure**
  - Add `match-game-postgres` using PostgreSQL 16 to `docker-compose.yml`.
  - Create database `match_game_db` with a dedicated user and named volume.
  - Add matching variables to `.env.example` without real credentials.
  - Do not expose this database through Core or add cross-database references.
  - Done when the isolated database reports healthy and accepts connections.

- [x] **M02 — Create Game Service and stateless Match Engine**
  - Add Spring Boot `game-service` as sole owner of `match_game_db` and Flyway migrations.
  - Add Python `match-engine` with FastAPI, immutable domain contracts, and no database dependency.
  - Keep `prediction-service` unchanged and separate.
  - Run both services on the internal Docker network.
  - Done when Game Service migrates its DB and both health endpoints are ready.

- [x] **M03 — Secure the `/game/*` identity contract**
  - Add `GAME_SERVICE_URL` to gateway configuration.
  - Route only `/game/*` to Spring `game-service`; preserve existing prediction upstreams.
  - Verify the user JWT in gateway middleware before proxying `/game/*`.
  - Overwrite client-supplied identity headers and forward trusted `X-User-Id`.
  - Authenticate gateway-to-Game-Service traffic with configured `INTERNAL_TOKEN`.
  - Reject missing/invalid identity in Spring Game Service.
  - Document ownership rule: Core UUID is an external string, never a DB foreign key.
  - Add gateway and Game Service tests for rejected forged identity.
  - Done when anonymous or spoofed game requests cannot reach game handlers.

### Phase 1 — pure match engine

- [x] **M04 — Define immutable match contracts and validation**
  - Define enums for position, role, zone, mentality, instructions, and event type.
  - Define `PlayerSnapshot`, `TeamSnapshot`, `Lineup`, `Tactic`, `MatchInput`,
    `MatchEvent`, `MatchStats`, and `MatchResult` with Pydantic models.
  - Validate eleven starters, one goalkeeper, unique players, valid formation slots,
    available bench members, and attribute range 1–100.
  - Add seed, `engine_version`, and `ruleset_version` to every input/result.
  - Add focused validation tests.
  - Done when invalid lineups fail before simulation and valid snapshots serialize.

- [x] **M05 — Implement deterministic action resolution**
  - Wrap Python `random.Random(seed)` behind one match-scoped random source.
  - Implement player selection and duel resolution from relevant attributes only.
  - Apply role fit, tactic, fatigue, morale, form, matchup, and bounded randomness.
  - Implement pass, carry, tackle, foul, shot, save, and goal outcomes.
  - Keep balance constants in one versioned rules module, not environment variables.
  - Test identical input/seed equality and selected edge cases.
  - Done when actions are deterministic and never read global randomness.

- [x] **M06 — Implement possessions, timeline, and statistics**
  - Run possessions across `DEFENSIVE`, `MIDDLE`, `ATTACKING`, and `BOX` zones.
  - Advance a match clock, emit kickoff/half-time/full-time and action events.
  - Track score, shots, shots on target, xG, possession, passes, fouls, cards,
    fatigue, and player ratings.
  - Emit absolute event `sequence` plus minute, second, team, player, zone, payload.
  - Add invariant checks for ordered events, non-negative scores, and valid players.
  - Add an offline balance command that simulates many seeded matches and prints
    aggregate distributions.
  - Done when one pure function returns a complete believable match under two seconds.

### Phase 2 — API and persistence

- [x] **M07 — Persist the minimal Career match slice**
  - Migrate `career_saves`, `clubs`, `players`, `fixtures`, `matches`, `match_events`, `match_team_stats`, and `match_player_stats` in Spring `game-service`.
  - Store owner user ID, status, seed, versions, JSONB input snapshot, result,
    timestamps, and idempotency key.
  - Add unique constraints for owner + idempotency key and match + event sequence.
  - Save match, events, and statistics in one transaction.
  - Roll back partial state on simulation or persistence failure.
  - Add repository tests against PostgreSQL.
  - Done when a stored match can be loaded and replayed from its snapshot.

- [x] **M08 — Expose authenticated Career fixture APIs**
  - Add minimal Career creation/read endpoints with seeded fictional clubs and players.
  - Add `POST /game/saves/{saveId}/fixtures/{fixtureId}/play` to validate, simulate, persist, and return a match.
  - Add `GET /game/saves/{saveId}/matches/{id}` and `/events` scoped to the save owner.
  - Return stable codes for validation, ownership, duplicate, and failed simulation.
  - Return the previous response for a repeated idempotency key.
  - Add OpenAPI examples for one scheduled fictional Career fixture.
  - Add integration tests for success, invalid lineup, ownership, and idempotency.
  - Done when API simulation meets the two-second target and cannot leak matches.

### Phase 3 — Match Centre

- [x] **M09 — Add typed frontend match client and setup flow**
  - Add shared TypeScript Career fixture and match types matching the API contract.
  - Add API functions and TanStack Query mutation/query keys.
  - Load the user's next scheduled Career fixture and club squad.
  - Add formation, lineup, role, and team instruction inputs with validation feedback.
  - Reuse the server-owned fixture idempotency key for repeated submissions.
  - Keep API calls out of the page component.
  - Done when a Career fixture submits a valid lineup and handles loading/error states.

- [x] **M10 — Replace random simulation with deterministic playback and report**
  - Remove client-side score/event generation from `web-client/src/app/matches/page.tsx`.
  - Render API score, ordered timeline, scoreboard, and instant/fast/normal playback.
  - Add post-match team/player statistics and tactical summary.
  - Preserve keyboard access and a non-drag alternative for lineup controls.
  - Add empty, loading, retry, and failed-match states.
  - Verify responsive desktop/mobile layouts.
  - Update `docs/API.md`, `docs/DATABASE.md`, and `docs/SMOKE.md`.
  - Done when refreshing the page reloads the same stored result and timeline.

### Phase 4 — Career season

- [x] **M11 — Add a minimal league season**
  - Seed 4 fictional clubs and a six-fixture, one-leg round robin for each new Career.
  - Add a Career date and `advance-day` action; fixtures remain locked until their date.
  - Derive standings from completed stored matches; do not add a duplicate standings cache.
  - Show the current table and next playable fixture in Career.

- [x] **M12 — Persist basic player condition**
  - Update player fitness and form from stored match player stats.
  - Recover squad fitness when the Career date advances.
  - Show fitness and form in the Career lineup selector.

- [x] **M13 — Finish a season**
  - Detect when all current-season fixtures are played.
  - Mark the Career as `SEASON_FINISHED`.
  - Store a champion and final-table snapshot.

- [x] **M14 — Start next season**
  - Add a `next-season` action for finished Careers.
  - Increment `season_number` and create a fresh fixture list for the same clubs.
  - Keep squads and player condition.

- [x] **M15 — Minimal season history**
  - Store completed season records in `season_records`.
  - Return season history with Career details.
  - Show champion/history in the Career UI.

- [x] **M16 — Squad depth**
  - Seed 18 players per club instead of exactly 11.
  - Send up to 7 bench players with the lineup.
  - Exclude unavailable players from valid lineup selection.

- [x] **M17 — Basic player quality display**
  - Seed position-weighted attributes.
  - Show OVR, fitness, form, and availability in the Career lineup controls.

- [x] **M18 — Minimal substitutions**
  - Match engine emits substitution events when bench is provided.
  - Bench players receive minutes in stored player stats.
  - Starters substituted off no longer receive full 90-minute fatigue.

- [x] **M19 — Minimal availability**
  - Add player `availability` and `unavailable_until`.
  - Engine can emit injury events; Spring marks injured players unavailable.
  - `advance-day` recovers players whose unavailable date has passed.

## Validation gates

### Phase 0

- `docker compose up` starts Core DB and `match_game_db` independently.
- Core tests and all `prediction-service` files/endpoints remain unchanged and green.
- `/matches/*` and `/standings/*` reach `prediction-service`; `/game/*` reaches
  Spring `game-service`; only Game Service calls `match-engine` internally.
- Invalid JWT, forged user header, and missing internal token are rejected.

### Phase 1

- Same seed and snapshot produce byte-equivalent result data.
- Engine tests cover every action branch and core invariants.
- Balance runner reports distributions without crashes or impossible state.
- Representative match completes under two seconds on a development machine.

### Phase 2

- Migrations apply to an empty game database.
- API tests prove owner isolation, idempotency, and transaction rollback.
- Stored input can reproduce the stored result with the recorded engine version.

### Phase 3

- `npm run build` succeeds.
- Existing backend/Python tests remain green.
- Smoke flow passes:

```text
login
  -> create or open Career
  -> open next fixture
  -> configure lineup and tactics
  -> simulate
  -> play timeline
  -> inspect report
  -> refresh
  -> see identical result
```

## Delivery order

```text
M01 -> M02 -> M03 -> M04 -> M05 -> M06 -> M07 -> M08 -> M09 -> M10
```

M04 can begin after the package skeleton from M02, but merge order stays linear to
keep contracts and migrations reviewable.

## Open questions

- None blocking. Exact balance constants and fictional team seed data are chosen
  during M05–M06 and adjusted from balance-runner evidence.
