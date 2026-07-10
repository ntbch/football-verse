# Database

PostgreSQL uses separate databases for platform and Career game data.

Schema changes are managed by Flyway migrations in:

```text
backend/platform/core-service/src/main/resources/db/migration
```

Career migrations are owned only by Spring `game-service`:

```text
backend/game/game-service/src/main/resources/db/migration
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
```

`match-engine` and `prediction-service` do not own `match_game_db`.

Career standings are derived from completed `matches` joined to `fixtures`; there is no duplicate standings cache to reconcile.

Career player condition lives on `players.fitness`, `players.morale`, and `players.form`; match snapshots remain immutable.

Career season state uses `career_saves.season_number` and `fixtures.season_number`; completed seasons are snapshotted in `season_records`.

Player availability lives on `players.availability` and `players.unavailable_until`.
