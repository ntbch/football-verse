# Current-State Baseline

Date: 2026-07-22  
Commit: `c48decd8`  
Purpose: behavioral and verification baseline before the whole-project refactor.

## Active Deployables

| Deployable | Current path | Owner | Data owner |
|---|---|---|---|
| Web | `apps/web/` | browser UI and route state | none |
| Core API | `services/core-api/` | auth, users, news, forum, notifications, user predictions | `football_verse` PostgreSQL |
| Gateway | `services/gateway/` | public proxy, JWT edge check, realtime | Redis fan-out/cache only |
| Content Ingestion | `services/content-ingestion/` | RSS/API adapters, checkpoint, spool, delivery | `ingestion_db` operational state |
| Prediction | `services/prediction/` | provider fixtures, standings, calculations | none |
| Career | `services/career/` | Career saves, squads, tactics, transfers, match persistence | `match_game_db` PostgreSQL |
| Match Engine | `services/match-engine/` | deterministic simulation | none |

The three tracked orphan files formerly under root `match-engine/` and
`backend/src/` were removed after the full verification gate and caller search
proved they were outside every build. The active Match Engine and Core files
remain under their deployable directories above.

## Baseline Verification

| Check | Result | Evidence / limitation |
|---|---|---|
| Web production build | Pass | Next.js generated all 24 routes |
| Web focused logic tests | Pass | 6/6 Career navigation, match playback, and auth privacy tests |
| Gateway build/tests | Pass | 6/6 identity and production-security tests |
| Core API compile | Pass | 149 main and 11 test source files compiled |
| Core API tests | Pass | 41/41 on an isolated, seed-free PostgreSQL database; login tests create their own users |
| Career tests | Pass | 24/24, including 6 PostgreSQL tests, on isolated PostgreSQL plus a temporary Match Engine |
| Prediction tests | Pass | 4/4 health/error, league/mock/provider, and deterministic normalization checks |
| Match Engine tests | Pass | 29/29 tests |
| Compose syntax | Pass | `docker compose config --quiet` |
| Integrated smoke | Pass | isolated Compose project exercised web, auth, news, forum, Prediction, Career, cookie refresh/logout, and browser reload/back privacy |
| Recovery rehearsal | Pass | synthetic PostgreSQL dump/restore rows and upload archive checksum match; exact temporary state removed |
| Performance baseline | Pass with one budget gap | 75,782 requests over 900 seconds; exact 70/20/10 mix; 0% errors; leaderboard exceeds 1 MB |

## Known Baseline Risks

- Legacy refresh-body clients remain accepted during the documented compatibility window.
- Legacy Career header auth exists behind an explicit disabled-by-default private-network flag until zero-use removal.
- Production identity/security configuration now rejects development secrets and insecure auth-cookie settings.
- Legacy article extraction remains available only behind `INGESTION_MODE=legacy`
  until the no-crawl metadata path completes its soak and contraction gate.
- Metadata Stories use a bounded 48-hour title-token comparison to group likely
  duplicate reports. Embeddings remain deferred until live volume or measured
  clustering quality requires them.
- Alert routing remains deployment-runtime work; repository thresholds are defined but no provider is fabricated.
- Prediction had no automated tests or development requirements before this baseline; both are now present.
- Core integration tests default to the development PostgreSQL port unless an isolated `DB_URL` is supplied.
- Career PostgreSQL tests skip unless `runPostgresIntegrationTests=true`; a skip cannot satisfy persistence refactor gates.
- `globals.css` and several UI/service modules contain multiple feature responsibilities.

## Standard Local Entry Point

Run all available checks with:

```powershell
./scripts/verify.ps1
```

The command creates isolated PostgreSQL containers and a temporary Match Engine, redirects uploads to scratch space, and cleans them up. It then builds and tests an isolated Compose project and removes its volumes. It fails when Docker or required dependencies are unavailable and never falls back to a development database.
