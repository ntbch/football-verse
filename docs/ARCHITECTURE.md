# Architecture

> This is the concise system overview. The canonical deployable inventory and
> known risks are in [current state](architecture/current-state.md); observed
> routes, identity flow, and ownership boundaries are in
> [service contracts](architecture/service-contracts.md).

## Service map

```text
Next.js Web
   |
Node Gateway
   |-- /api/v1/* ------> Spring Core --------> core_db
   |-- /matches/* -----> Prediction Service
   |-- /standings/* ---> Prediction Service
   `-- /game/* --------> Spring Game Service -> match_game_db
                                  |
                                  `----------> Python Match Engine /simulate

Content Ingestion ------> Spring Core
   |                         |
   `--> ingestion_db         `--> RawItem / Story / Evidence
```

## Ownership

### Spring Core

Owns authentication, users, news, forum, notifications, admin, real-match
prediction submissions, and `core_db`.

### Prediction Service

Owns third-party football-provider access for real fixtures, standings, and
prediction inputs. It does not own Football Manager game state.

### Spring Game Service

Owns Career saves, clubs, players, tactics, schedules, standings, match history,
transactions, Flyway migrations, and `match_game_db`. Core user IDs are external
references only; no cross-database foreign keys or joins.

### Python Match Engine

Stateless calculation service. It accepts immutable `MatchInput` and returns
`MatchResult`. It has no database, migration, or end-user authentication logic.

### Gateway and realtime

Gateway is the public entry point. Core routes retain existing auth behavior. Game
routes validate JWT, overwrite identity headers, and forward trusted identity to
Game Service. Redis/Socket.IO owns fanout only, never business truth.

### Content Ingestion

Owns RSS/API provider adapters, source scheduling, persistent checkpoints,
durable spool delivery, retry, and operational `ingestion_db` state. Core owns
Publisher, Connector configuration, RawItem, Story, Evidence, and interactions.
Default RSS metadata mode does not request article destination pages.

## Game flow

```text
Client command
  -> Gateway validates JWT
  -> Game Service loads state from match_game_db
  -> Game Service builds MatchInput
  -> Match Engine simulates deterministically
  -> Game Service validates and persists MatchResult transactionally
  -> Client receives stored result
```

## Rules

- `core_db` and `match_game_db` are separate PostgreSQL databases.
- Only Game Service reads or writes `match_game_db`.
- Match Engine stays deterministic for identical input, seed, and versions.
- Prediction Service stays independent from Football Manager simulation.
- Add Redis jobs, brokers, or more services only after measured need.
