# Architecture

## Current State

```text
Next.js Frontend
      |
      | REST API
      v
Spring Boot Backend
      |
      | JPA
      v
PostgreSQL
```

Phase 1 keeps public, admin, news, forum, report, and notification boundaries separate.

## Target Backend Shape

Use staged hybrid microservices, not a big-bang rewrite.

```text
Next.js Web
   |
   v
API Gateway
   |--------------------|----------------------|
   v                    v                      v
Spring Boot Core     Python Match/Game      Node Realtime
auth/users           fixtures/standings     live streams
news/forum           prediction inputs      leaderboard streams
admin/moderator      mini-manager sim       simulation events
   |                    |                      |
 core_db              match_game_db          realtime optional Redis
```

## Service Boundaries

### Spring Boot Core

Owns current product state:

- auth, JWT, OAuth, email verification, reset password
- users, roles, profiles
- news, RSS CMS, forum, reports
- admin and moderator APIs
- user prediction submissions and points ledger

Routes:

- `/api/v1/auth/*`
- `/api/v1/users/*`
- `/api/v1/news/*`
- `/api/v1/forum/*`
- `/api/v1/admin/*`
- `/api/v1/moderator/*`
- `/api/v1/predictions/*`

### Python Match/Game

Owns football data and simulation:

- third-party football API sync
- leagues, teams, players, fixtures, standings
- match result snapshots
- mini Football Manager simulation
- later: model-based prediction support

Routes:

- `/matches/*`
- `/standings/*`
- `/game/*`

### Node Realtime

Owns fanout, not business truth:

- live score stream
- prediction leaderboard stream
- simulation event stream

Routes:

- `/realtime/live`
- `/realtime/leaderboard`
- `/realtime/game`

Use Spring Boot SSE until Node service has a real need. Do not add Node just for a placeholder.

## Phase Plan

### Phase 0: Contracts

- Document gateway routes, service ownership, and database ownership.
- Keep current Spring Boot and Next.js app running unchanged.
- Done when this file names every first-wave service and route.

### Phase 1: Match Schedule + User Prediction MVP

- Add Python Match/Game service for Premier League fixtures and standings.
- Read the football provider key from `FOOTBALL_API_KEY`; never commit real keys.
- Return mock fixtures and standings when no key is configured.
- Sync Premier League fixtures and standings.
- Show fixtures and standings in Next.js at `/matches`.
- Show 1X2 prediction table in Next.js at `/predictions`.
- Add Spring Boot prediction APIs that store user picks and points in `core_db`.
- Browse fixtures without login; require login only to submit predictions.
- Done when user can view fixtures, submit prediction, and see prediction history.

### Phase 2: Scoring + Leaderboard

- Update points when match result is final.
- Add leaderboard read API in Spring Boot Core.
- Use existing polling/SSE first.
- Done when final match result recalculates user points.

### Phase 3: Node Realtime

- Add Node service for leaderboard/live/game streams.
- Fan out events from Spring Boot Core and Python Match/Game.
- Use Redis pub/sub only if one process is not enough.
- Done when leaderboard updates without page refresh.

### Phase 4: Mini Football Manager

- Keep game rules in Python Match/Game.
- Start with compact simulation: squad, formation, tactic, match events, result.
- Keep UI inside Next.js unless game screens become a separate product.
- Done when user can run one simulated match and inspect timeline.

### Phase 5: Kubernetes Learning

- Move working Docker Compose services to minikube manifests.
- Keep configs boring: deployments, services, config maps, secrets.
- Done when local minikube runs gateway, web, core, match-game, and realtime.

## Gateway Routes

| Path | Upstream | Notes |
| --- | --- | --- |
| `/api/v1/*` | Spring Boot Core | Existing API stays stable. |
| `/matches/*` | Python Match/Game | Fixtures, results, teams. |
| `/standings/*` | Python Match/Game | League tables. |
| `/game/*` | Python Match/Game | Simulation APIs. |
| `/realtime/*` | Node Realtime | Added only in Phase 3. |

## Data Ownership

- `core_db`: users, auth, news, forum, reports, prediction submissions, points.
- `match_game_db`: leagues, teams, players, fixtures, standings, simulation runs.
- `realtime`: no source-of-truth database at first; Redis only when fanout needs it.

No cross-service table joins. Use IDs and API/event contracts.

## Events

- `match.resulted`: Python Match/Game emits final result.
- `prediction.scored`: Spring Boot Core emits score update.
- `game.event.created`: Python Match/Game emits simulation timeline event.

Start with HTTP calls plus database polling where enough. Add broker only when realtime service exists.
