# Career world simulation design

## Understanding summary

- Expand Career to eight clubs and a proper double round-robin league.
- Use 14 weekly matchdays with four fixtures on the same date.
- The player controls only `managed_club_id`, whether that club is home or away.
- AI-only fixtures use the same full `match-engine`, manager plans, persistence, and player-state updates.
- Playing the player fixture triggers completion of the other three fixtures in that matchday.
- `advance-day` is blocked while a due player fixture or incomplete matchday remains.
- Do not add queues, workers, new services, PvP, or automatic skipping of player matches.

## Assumptions

- A season has 56 fixtures: 14 per club, seven home and seven away.
- At most three AI matches are simulated per matchday.
- Bounded parallel engine calls keep matchday completion below 15 seconds.
- Only one matchday orchestration may run for a Career at once.
- AI fixture seeds derive deterministically from Career, season, and fixture.
- Retry never changes or duplicates a stored result.
- `game-service` orchestrates; `match-engine` remains stateless.

## Architecture

Keep season orchestration in `game-service`. Add `fixtures.matchday_number`; a separate matchday table is unnecessary because season, matchday number, and date fully identify a round.

Use a deterministic circle scheduler:

```text
8 ordered clubs
-> seven first-leg rounds
-> reverse home/away for seven second-leg rounds
-> 14 matchdays x four fixtures
```

The first matchday starts after Career creation and subsequent matchdays are seven days apart. Each club appears exactly once per matchday and finishes with seven home and seven away fixtures.

## Managed-club match flow

Only the fixture containing `career_saves.managed_club_id` accepts player lineup and tactics.

1. Load the managed fixture and identify whether the player club is home or away.
2. Attach player lineup/tactic to the correct side.
3. Generate the opponent lineup, tactic, and manager plan through existing AI policies.
4. Simulate and persist the player match idempotently.
5. Load remaining `SCHEDULED` fixtures with the same season and matchday number.
6. Build both AI teams with the same full manager and match policies.
7. Simulate up to three matches concurrently.
8. Persist each result independently with key `ai-{season}-{fixtureId}`.
9. Apply events, fitness, form, manager records, standings, and season completion after the round.

The play response returns the player match ID, matchday number, simulated AI match IDs, failed fixture IDs, and `matchdayComplete`.

## Full engine decision

All fixtures use the same full `match-engine`. The project has only three AI matches per round, so a second quick-result model would create balance drift without a meaningful performance gain. AI matches store normal input snapshots, events, team/player stats, injuries, and manager decisions. Their Match Centre is view-only.

Consider a quick engine only if future expansion introduces many leagues or hundreds of fixtures per game date.

## Daily progression

`advance-day` checks before changing the date:

- If a due `SCHEDULED` fixture contains the managed club, return `409 Play your fixture before advancing`.
- If the player match is complete but another fixture in that matchday is still scheduled, return `409 Complete the matchday before advancing`.
- Otherwise advance recovery, training, scouting, transfers, and manager policies normally.

When the player manager is unemployed and `managed_club_id` is null, all due fixtures are AI fixtures. `advance-day` completes them before moving beyond their date.

## Concurrency, failure, and retry

Do not hold a database transaction or row lock during HTTP calls to `match-engine`.

- Acquire a short Career version/processing guard before orchestration.
- Build immutable inputs and call at most three simulations concurrently.
- Persist each fixture in its own transaction.
- Fixture uniqueness and idempotency keys prevent duplicate matches, events, and stats.
- A retry loads existing results and simulates only fixtures still `SCHEDULED`.
- If one AI call fails, keep the player and successful AI results; return `matchdayComplete=false` and failed fixture IDs.
- The UI exposes `Complete matchday` to retry incomplete rounds.
- `advance-day` remains blocked until the matchday is complete.

This favors recoverable partial progress over one long transaction spanning network calls.

## API and UI

Extend fixture responses with `matchdayNumber`. Extend play response with:

```text
playerMatchId
matchdayNumber
simulatedAiMatchIds[]
failedFixtureIds[]
matchdayComplete
```

Add a retry endpoint or reuse a dedicated action:

- `POST /game/saves/{saveId}/matchdays/{matchdayNumber}/complete`

Career UI changes:

- Overview shows current matchday, next managed fixture, and countdown.
- Fixtures are grouped into 14 matchday blocks of four matches.
- Play controls appear only on the managed fixture.
- Player-away matches still use the player's lineup and tactic on the away side.
- After playing, show `Simulating rest of matchday...` until the response finishes.
- Incomplete rounds show `Complete matchday` and failed-fixture count.
- All stored AI matches may open in read-only Match Centre.

## Testing and balance

- Scheduler tests require 56 fixtures, 14 rounds, and four fixtures per round.
- Every club must play 14 matches, seven home and seven away.
- No self-match, duplicate orientation, missing pairing, or club duplication within a round.
- Tests cover player home and away input placement.
- AI fixtures must use generated manager lineup, tactic, and deterministic seeds.
- Retry tests verify no duplicate matches, events, team stats, or player stats.
- Partial failure tests preserve successful results and recover only remaining fixtures.
- Advance guard tests cover due player fixtures and incomplete rounds.
- Multi-season smoke verifies equal played counts, exactly 56 results, table consistency, seed stability, and matchday runtime.

## Risks

- Three full simulations may make the play request slow.
- Parallel callbacks can fail independently.
- Concurrent retries can duplicate work before uniqueness rejects persistence.
- Eight seeded squads/managers increase Career creation cost and DB volume.
- Scheduling bugs can create unfair home/away counts or block season completion.

Bounded concurrency, per-fixture idempotency, strict scheduler invariants, and retryable partial progress mitigate these risks.

## Decision log

- Chose Career world integrity before squad dynamics or youth systems.
- Chose daily progression with player fixtures blocking `advance-day`.
- Chose eight clubs and double round-robin over the current four-club single round-robin.
- Chose 14 weekly matchdays with four simultaneous fixtures.
- Chose no automatic skipping of player matches.
- Chose the same full match engine for player and AI fixtures; no quick-result engine at this scale.
- Chose player match completion as the trigger for remaining AI fixtures.
- Chose bounded parallel simulation and independent idempotent persistence over a queue or long transaction.
- Chose recoverable partial matchdays with an explicit retry action.
