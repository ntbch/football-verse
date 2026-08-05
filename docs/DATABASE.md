# Database

> This file is the canonical database-ownership overview. Recovery procedures
> are in the [database restore runbook](runbooks/database-restore.md), and the
> current deployable inventory is in [current state](architecture/current-state.md).

PostgreSQL uses separate databases for the platform and ingestion operational
state. Career data is retained outside the active application topology until
the approved transition and retention windows complete.

Schema changes are managed by Flyway migrations in:

```text
services/core-api/src/main/resources/db/migration
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
postgresql://127.0.0.1:55434/ingestion_db
```

`ingestion_db` stores spool, retry, per-source lease/checkpoint, and source-sync
readiness state only. Durable
Publisher, RawItem, Story, Evidence, comments, likes, and bookmarks remain in
the Core platform database.

Prediction data remains owned by its own service and is not stored in the Core
platform database. Archived Career data is not migrated or joined with Minigame
state.

## Premium billing ownership

Premium billing remains a bounded Core module, not a separate database or
microservice. Migration `V64__premium_sepay_billing.sql` owns `payment_orders`,
`payment_events`, `premium_memberships`, and `premium_membership_ledger` in the
platform database. The payment event and entitlement ledger commit in one Core
transaction; raw provider payloads and checkout secrets are never persisted.
