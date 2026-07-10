# Football Manager Lite & Match Engine Design

**Status:** Approved  
**Date:** 2026-07-10  
**Scope:** Product design and phased implementation plan; no implementation yet.

## 1. Product direction

Football Verse will add a Career-focused football management game:

- Career is the only player-facing game mode in the current scope.
- Each user owns isolated Career saves; AI controls other clubs.
- Online leagues and PvP will be separate modes added later.
- Default clubs and players are fictional.
- Custom dataset import can be added later without making real data a dependency.

Management depth is medium: squad, tactics, training, fitness, morale, injuries,
contracts, finances, academy/progression, scouting, and transfers. Staff,
media, sponsors, detailed accounting, and deep scouting operations are deferred.

The game prioritizes believable simulation and tactics with visible trade-offs.
Progression supports management but must not become pay-to-win or a card-collection
power curve.

## 2. First success milestone

The first milestone is one complete match with:

- valid players, lineup, formation, roles, and tactics;
- deterministic simulation from a seed;
- believable score and event timeline;
- team and player statistics;
- instant result and timeline playback;
- a post-match report explaining important tactical effects.

Career seasons, full transfers, PvP, online leagues, and a 2D pitch are explicitly
outside this milestone.

## 3. Product loop

Career follows this loop:

```text
Inbox
  -> review squad and fitness
  -> choose training and tactics
  -> handle contracts and transfers
  -> inspect next opponent
  -> choose lineup
  -> play match
  -> review report
  -> advance time
```

The Continue action advances to the next meaningful interruption rather than one
empty day at a time. It stops for matches, injuries, offers, contract decisions,
or required inbox items.

Career time advances when the player chooses. Future online leagues use a shared
real-world schedule and remain independent from Career saves.

## 4. Game systems

### 4.1 World

Owns game date, seasons, competitions, fixtures, results, and standings. The first
Career version needs one round-robin league. Cups, promotion/relegation, and
multiple countries follow later.

### 4.2 Club

Owns reputation, finances, squad, stadium summary, academy level, and tactical
identity. Only values that affect player decisions need implementation.

### 4.3 Squad and player

Stable player data:

- identity, age, nationality, preferred foot;
- primary and secondary positions;
- attributes from 1 to 100;
- soft potential ceiling;
- professionalism, ambition, loyalty, and temperament;
- contract, wage, value, and squad role.

Changing match state:

- fitness;
- match sharpness;
- morale;
- form;
- injury;
- suspension;
- tactical familiarity.

Attribute groups:

- Technical: passing, first touch, dribbling, tackling, finishing.
- Physical: pace, strength, stamina, aerial.
- Mental: decisions, positioning, composure, aggression, teamwork.
- Goalkeeping: handling, reflexes, one-on-one, distribution.

Overall rating is for UI and scouting only. Match actions use the few relevant
attributes rather than overall rating.

### 4.4 Progression and training

Development runs weekly from age, potential, minutes, training quality, morale,
and injuries. Players do not receive manually assigned upgrade points. Physical
attributes usually decline first with age.

Training categories:

- recovery;
- fitness;
- defending;
- possession;
- attacking;
- set pieces;
- tactical familiarity.

Heavy training improves development but costs fitness and raises injury risk.
Form has a small situational effect and must not create an unstoppable snowball.
Newgens replace retiring players at season boundaries.

### 4.5 Scouting

Unknown attributes appear as ranges. More knowledge narrows those ranges. The
first version uses a club scouting level rather than individual staff members.

### 4.6 Transfers, contracts, and finances

Transfer flow:

```text
scout -> enquire or bid -> club response -> contract negotiation
      -> budget validation -> completion
```

The initial offer model supports fixed fee, installments, and sell-on percentage.
Loans and swaps are deferred.

Contracts include dates, wage, squad role, appearance bonus, and goal bonus.
Unmet playing-time expectations reduce morale and can cause transfer requests or
failed renewals.

Financial scope:

- balance;
- transfer budget;
- wage budget;
- match and competition income;
- wages;
- transfer fees paid and received.

AI clubs identify weak positions, shortlist affordable players, sell surplus or
expiring players, and obey transfer and wage budgets. Correct and stable behavior
is more important than elaborate AI.

## 5. Match engine approach

The accepted model is possession + zone + duel. It is deeper than aggregate team
probabilities and much smaller than a continuous 22-player spatial simulation.

Pitch zones:

- `DEFENSIVE`
- `MIDDLE`
- `ATTACKING`
- `BOX`

Each possession follows:

```text
start possession
  -> choose attacking route
  -> move between zones
  -> select involved players
  -> resolve duel or action
  -> turnover, foul, chance, or shot
  -> update fatigue and match state
```

Each action combines two to four relevant attributes with player role, tactic,
fatigue, morale, form, matchup, and seeded randomness.

### 5.1 Input

The engine receives an immutable snapshot:

```text
MatchInput
  seed
  rules and engine version
  home lineup, bench, and tactics
  away lineup, bench, and tactics
```

### 5.2 Output

The engine returns:

- final score and status;
- ordered timeline events;
- team and player statistics;
- fitness changes;
- cards, suspensions, and injuries;
- optional debug trace for balancing.

Same input, seed, engine version, and ruleset version must produce the same result.

### 5.3 Interactive matches

Instant mode simulates the entire match. Interactive mode simulates to a safe
checkpoint, returns events, accepts substitutions or tactical commands, then
continues. The presentation clock does not drive simulation state.

The UI can provide instant, fast, and normal playback from already-generated
events. WebSocket is not needed for the first milestone.

## 6. Tactics

Team instructions:

- mentality: defensive, cautious, balanced, positive, attacking;
- tempo: slow, normal, fast;
- width: narrow, normal, wide;
- passing: short, mixed, direct;
- pressing: low, standard, high;
- defensive line: low, standard, high;
- transition: hold shape, balanced, counter;
- time wasting: off, moderate, high.

Formation defines positional slots. Playing out of position applies a penalty
based on familiarity.

Roles change behavior rather than adding flat bonuses. Examples include poacher,
target forward, pressing forward, winger, inside forward, playmaker, box-to-box,
ball winner, stopper, cover, ball-playing defender, and sweeper keeper.

Every tactical choice has a cost. High press wins the ball higher but drains
stamina and exposes space. Direct passing progresses faster but loses accuracy.
Attacking mentality commits more players and weakens defensive transitions.

Mid-match changes require a short in-game adjustment period to discourage tactic
spam. The UI explains trade-offs and post-match effects without exposing exact
probability formulas.

## 7. Architecture and ownership

Reuse the current services:

```text
Next.js Web
    |
Gateway
    |-- Spring Boot Core: auth, users, authorization
    |       |
    |       `-- core_db
    |
    |-- Python Prediction: real fixtures, standings, provider data
    |
    |-- Spring Game Service: Career, persistence, orchestration
    |       |
    |       `-- match_game_db
    |
    `-- Python Match Engine: stateless simulation only
```

`game-service` is a standalone Spring Boot service and owns `match_game_db`.
Python `match-engine` is stateless: it receives snapshots and returns results; it
does not connect to a database or validate end-user identity.

`match_game_db` is a physically separate PostgreSQL database, not another schema
inside `core_db`.

Rules:

- no foreign keys across databases;
- no cross-database joins;
- Spring `game-service` alone reads and writes `match_game_db`;
- Core user IDs are stored only as external references;
- services exchange data through APIs or future events;
- migrations, backup, restore, and season reset are independent.

Do not add Redis, a broker, NumPy, Pandas, or another service until measurements
show a need. Keep the match engine a pure Python module independent from FastAPI
and database code.

## 8. Core match flow

```text
POST /game/matches
  -> authenticate user and save ownership
  -> validate fixture, lineup, and tactics
  -> create match and deterministic seed
  -> store immutable input snapshot
  -> run engine
  -> store result, events, and statistics
  -> apply fitness, cards, and injuries
  -> commit transaction
  -> return match response
```

An idempotency key prevents duplicate matches. Match status is one of `CREATED`,
`RUNNING`, `PAUSED`, `COMPLETED`, or `FAILED`. Every match belongs to a Career
fixture and mutates Career state transactionally.

API groups:

- `/game/saves`
- `/game/worlds/{id}/advance`
- `/game/clubs`
- `/game/squads`
- `/game/tactics`
- `/game/fixtures`
- `/game/matches`
- `/game/transfers`
- `/game/training`
- `/game/inbox`

## 9. Data model

World templates are versioned and immutable:

- `world_templates`
- `competition_templates`
- `club_templates`
- `player_templates`
- `ruleset_versions`

Career instance data:

- `career_saves`
- `competitions`, `seasons`, `fixtures`, `standings`
- `clubs`, `club_finances`
- `players`, `player_attributes`, `contracts`
- `squads`, `squad_members`
- `tactics`, `lineups`
- `training_plans`, `injuries`, `suspensions`
- `transfer_listings`, `transfer_offers`, `transfers`
- `matches`, `match_events`, `match_team_stats`, `match_player_stats`
- `inbox_items`

Every Career-owned row carries `career_save_id`. All queries are scoped by that ID.
`owner_user_id` is an external Core identifier without a database foreign key.

Matches store JSONB input snapshots plus seed, engine version, and ruleset version.
Events have `match_id`, absolute `sequence`, minute, second, type, team, player,
zone, and JSONB payload. Fields needed for filtering remain normal columns.

Dataset imports create new template versions and never mutate active saves.

## 10. User experience

Routes:

- `/game`: create or select Career;
- `/game/[saveId]`: dashboard;
- `/game/[saveId]/inbox`;
- `/game/[saveId]/squad`;
- `/game/[saveId]/tactics`;
- `/game/[saveId]/schedule`;
- `/game/[saveId]/training`;
- `/game/[saveId]/transfers`;
- `/game/[saveId]/finances`;
- `/game/[saveId]/match/[matchId]`;

Dashboard emphasizes required decisions, next match, and Continue. Match Centre
contains scoreboard and speed controls, timeline, and tactical controls. Post-match
reports initially show xG, shots, possession, passes, big chances, zone heatmap,
ratings, and main tactical explanations.

A later 2D pitch animates event and zone metadata; it does not replace the engine.
Drag-and-drop tactics must also support buttons, forms, and keyboard input.

## 11. Security and reliability

Every Career command validates JWT, save ownership, save state, command timing,
lineup availability, budgets, contracts, and competition rules. The client sends
intent only; the server calculates prices, probabilities, results, and effects.

Stable error codes include:

- `LINEUP_INVALID`
- `PLAYER_UNAVAILABLE`
- `INSUFFICIENT_BUDGET`
- `MATCH_ALREADY_COMPLETED`
- `COMMAND_NOT_ALLOWED`
- `SAVE_VERSION_CONFLICT`

Use optimistic locking for saves and matches. Simulation failure rolls back result
and side effects together. Input snapshot and seed permit safe diagnosis or retry.
Logs must not contain JWTs or full private save data.

## 12. Performance and operations

Initial target:

- 1,000 to 10,000 registered users;
- several hundred concurrent simulations;
- complete instant simulation under two seconds;
- responsive web UI, desktop first and mobile usable.

PostgreSQL remains the source of truth. Back up and restore `match_game_db`
independently. Add queues, caches, or extra workers only after measured contention
or latency shows they are necessary.

## 13. Testing and balancing

- Engine unit tests cover possession, duel, shot, fatigue, cards, and injuries.
- Determinism test verifies identical input and seed produce identical output.
- Invariant checks prevent negative scores, invalid lineups, and unordered events.
- Offline balance runner simulates many matches and reports goal, home advantage,
  card, injury, and tactic distributions.
- API integration tests cover ownership, idempotency, optimistic locking, and
  transaction rollback.
- One end-to-end path covers Career fixture setup, simulation, playback, and report.

Formula changes carry engine or ruleset versions. Active saves retain their version
when a change would materially alter balance.

## 14. Delivery phases

### Phase 0: Game service foundation

- Create standalone `match-engine` Python service without changing
  `prediction-service`.
- Configure separate `match_game_db` and migrations.
- Add health check and Docker configuration.
- Establish gateway/Core authentication contract.

### Phase 1: Pure match domain

- Implement player/team snapshots, lineup, formation, and tactics.
- Implement seeded random, zones, possessions, and duels.
- Add shot, goal, foul, card, fatigue, and statistics.
- Add focused tests and offline balance runner.

**Exit:** a complete match runs from tests or CLI without UI or database.

### Phase 2: Match API and persistence

- Create match endpoints and input validation.
- Store snapshots, results, events, and statistics.
- Add idempotency, versions, and replay support.
- Link every simulated match to a Career save and scheduled fixture.

**Exit:** API completes one match under two seconds.

### Phase 3: Match Centre

- Replace the random client simulator.
- Add lineup and tactic setup.
- Add scoreboard, timeline, playback speed, and report.

**Exit:** first approved product milestone is complete.

### Phase 4: Interactive match

- Add checkpoints, substitutions, and tactical commands.
- Add injury and suspension consequences.
- Add extra time and penalties only when competition rules require them.

### Phase 5: Career foundation

- Add templates, saves, clubs, seasons, fixtures, and standings.
- Add time advancement, AI lineup, and AI match simulation.
- Add dashboard, inbox, and schedule.

### Phase 6: Medium management depth

- Add fitness, morale, form, training, and progression.
- Add injuries, contracts, finances, scouting, and transfers.
- Add AI transfers, newgens, and season rollover.

### Phase 7: Expansion

- Add dataset import.
- Add multiple competitions and cups.
- Add illustrative 2D pitch.
- Design online league and PvP as separate modes.

## 15. Decision log

| Decision | Alternatives | Reason |
| --- | --- | --- |
| Career-only product | Separate standalone match mode | Keeps progression and match consequences as the core loop. |
| Medium management depth | Lite; hardcore | Enough meaningful decisions without staff/media/accounting bloat. |
| Fictional default data with later imports | Real-only data | Avoids licensing and provider dependency while preserving extensibility. |
| Isolated Career saves | One shared world | Easier pacing, reliability, and balance; multiplayer remains independent. |
| Player-controlled Career time | Real-time Career | Lets users play freely; online leagues can use real schedules later. |
| Simulation realism plus readable tactics | Progression-first design | Makes management decisions the source of advantage. |
| Possession + zone + duel engine | Aggregate odds; full spatial simulation | Best balance of depth, explainability, performance, and maintenance. |
| Timeline before 2D pitch | Spatial renderer first | Proves game rules before investing in presentation. |
| Spring Game Service owns game state; Python owns simulation math | Python owns persistence; Core owns game | Keeps Python stateless and keeps `match_game_db` isolated from `core_db`. |
| Separate physical `match_game_db` | Shared schema or database | Independent ownership, migrations, backup, and lifecycle. |
| PostgreSQL without Redis/broker initially | Distributed infrastructure now | Initial load does not justify extra operational cost. |
| Deterministic seed and versioned rules | Unversioned randomness | Enables replay, testing, balance analysis, and dispute diagnosis. |
| Match milestone before Career | Broad thin product | Establishes the highest-risk core before surrounding systems. |

## 16. Deferred decisions

- Monetization model.
- Exact balance constants and probability curves.
- Final competition structure and world size.
- Dataset import schema and licensing rules.
- Online league cadence and PvP matchmaking.

These decisions are intentionally deferred until their implementation phase.
