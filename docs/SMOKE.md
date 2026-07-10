# Phase 1 Smoke Notes

Last run: 2026-07-04 12:04 Asia/Bangkok.

## Commands

```powershell
docker compose up -d postgres
mvn test
mvn -DskipTests clean test-compile
npm.cmd run build
npx.cmd next build --debug
npx.cmd tsc --noEmit --incremental false
```

## Results

- PostgreSQL was reachable at `127.0.0.1:55432`; Flyway connected to PostgreSQL 16.14 during backend tests.
- `mvn test`: passed, 26 tests run, 0 failures, 0 errors.
- `mvn -DskipTests clean test-compile`: passed on the earlier 11:52 run.
- `npm.cmd run build`: started Next.js 15.5.20, then produced no further output for more than 3 minutes; the hanging Node build processes were stopped.
- `npx.cmd next build --debug`: also stopped after hanging after the Next.js banner.
- `npx.cmd tsc --noEmit --incremental false`: passed on the earlier 11:52 run.

## Close Status

Backend verification is green. Phase 1 is not fully green until `npm.cmd run build` completes successfully.

## Career Match M10 — 2026-07-10

- `mvn -q test`: passed for `game-service`.
- `node --test src/app/matches/_playback.test.ts`: 1 passed.
- `npm.cmd exec tsc -- --noEmit --incremental false`: passed.
- Python match-engine image tests: 13 passed during M08.
- Spring → Python → PostgreSQL integration passed during M08; M09 rerun is pending because Docker Desktop was stopped.
- `npm.cmd run build` still hangs after the Next.js banner in this existing environment; no TypeScript error is reported.

## Career Season M11 — 2026-07-10

- New Career seeds 4 fictional clubs and 6 one-leg round-robin fixtures.
- `advance-day` must reach the fixture date before the fixture can be played.
- League table is calculated from completed persisted matches.
- `mvn -q test` and TypeScript compiler passed; PostgreSQL integration rerun awaits Docker Desktop.

## Career Condition M12 — 2026-07-10

- Playing a fixture lowers involved player fitness and adjusts form from rating.
- `advance-day` recovers player fitness.
- Career lineup selector shows Fit/Form values.
- `mvn -q test` passed for `game-service`.

## Career Seasons M13-M15 — 2026-07-10

- Current-season fixtures are scoped by `season_number`.
- Playing every fixture marks the Career `SEASON_FINISHED` and records champion/history.
- `next-season` increments the season and creates a fresh six-fixture schedule.
- `mvn -q test` and `tsc --noEmit` passed.

## Career Squad M16-M19 — 2026-07-10

- New clubs seed 18 players with position-weighted attributes.
- Existing shallow squads are backfilled to 18 players.
- Career lineup sends starters plus up to 7 bench players.
- Match engine emits substitution events and stores bench minutes.
- Injuries can mark players unavailable until a later Career date.
- `mvn -q test`, `tsc --noEmit`, Docker match-engine build, and Python `compileall` passed.
