# Database

PostgreSQL is the Phase 1 database.

Schema changes are managed by Flyway migrations in:

```text
backend/src/main/resources/db/migration
```

Hibernate runs with `ddl-auto=validate`; it must not create or mutate production schema.

Use the `prod` Spring profile in deployed environments so seed data is off by default.

Start with:

```powershell
docker compose up -d postgres
```

Local JDBC default:

```text
jdbc:postgresql://127.0.0.1:55432/football_verse
```
