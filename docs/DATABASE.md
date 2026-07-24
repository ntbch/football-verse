# Database

> This file is the canonical database-ownership overview. Recovery procedures
> are in the [database restore runbook](runbooks/database-restore.md), and the
> current deployable inventory is in [current state](architecture/current-state.md).

PostgreSQL uses separate databases for platform, ingestion operational state,
and Career game data.

Schema changes are managed by Flyway migrations in:

```text
services/core-api/src/main/resources/db/migration
```

Career migrations are owned only by Spring `game-service`:

```text
services/career/src/main/resources/db/migration
```

Hibernate runs with `ddl-auto=validate`; it must not create or mutate production schema.

Use the `prod` Spring profile in deployed environments so seed data is off by default.

Start with:

```powershell
docker compose up -d postgres
docker compose up -d match-game-postgres
```

Local JDBC default:

```text
jdbc:postgresql://127.0.0.1:55432/football_verse
jdbc:postgresql://127.0.0.1:55433/match_game_db
postgresql://127.0.0.1:55434/ingestion_db
```

`ingestion_db` stores spool, retry, per-source lease/checkpoint, and source-sync
readiness state only. Durable
Publisher, RawItem, Story, Evidence, comments, likes, and bookmarks remain in
the Core platform database.

`match-engine` and `prediction-service` do not own `match_game_db`.

Career standings are derived from completed `matches` joined to `fixtures`; there is no duplicate standings cache to reconcile.

Fixtures carry `matchday_number`. New seasons use a deterministic 8-club circle schedule: 14 weekly rounds, four fixtures per round, and reversed home/away second legs.

Career player condition lives on `players.fitness`, `players.morale`, and `players.form`; match snapshots remain immutable.

Career season state uses `career_saves.season_number` and `fixtures.season_number`; completed seasons are snapshotted in `season_records`.

Player availability lives on `players.availability` and `players.unavailable_until`.

Training focus lives on `career_saves.training_focus`; player development updates `players.attributes` and `players.age` at season rollover.

Transfers use existing `players.club_id` and `clubs.balance`; no finance ledger is stored yet.

AI club personality lives on `clubs.preferred_tactic`; presets expand into match snapshot tactic fields, so no separate tactics table is needed.

Career ownership now pins one `managed_club_id`. Transfer negotiations live in `transfer_offers`; per-club knowledge lives in `scouting_reports`. Completion locks offer/player/club rows before moving ownership and money.

Manager identity and traits live in `managers`; appointments and records live in `manager_careers`, board targets in `manager_objectives`, and compact explanations in `manager_decisions`. `career_saves.player_manager_id` persists the player identity while `managed_club_id` may become null after dismissal.

Deleting a Career save cascades game data inside `match_game_db`; it does not touch the platform DB or `prediction-service`.
