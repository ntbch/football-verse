# Database Backup and Restore

Date: 2026-07-22  
Owners: Core PostgreSQL and Career PostgreSQL

## Contract

- Back up both databases at least daily with `pg_dump --format=custom` to an
  encrypted, access-controlled store outside the Docker host.
- Retain 7 daily, 5 weekly, and 12 monthly recovery points.
- Current RPO: 24 hours. Current RTO: 4 hours.
- Rehearse quarterly and after a PostgreSQL major-version or backup change.
- Never print connection strings, passwords, tokens, or restored row contents.

## Backup

Use the database-specific service account from the secret store. Write to a
new timestamped object, verify `pg_restore --list`, record its SHA-256 checksum,
then mark it complete. Never overwrite the previous successful backup.

Core and Career are separate systems of record. A backup is incomplete unless
both artifacts, their schema/Flyway versions, checksums, and timestamps exist.

## Restore

1. Declare the recovery point and obtain incident-lead approval.
2. Restore into new isolated databases, never over the only existing copy.
3. Run `pg_restore --exit-on-error`, Flyway validation, row-count checks for
   critical tables, and ownership checks without exporting row contents.
4. Start the matching application versions against the restored databases and
   run auth, news/forum/prediction, and Career smoke paths.
5. Switch traffic only after checks pass; preserve the old databases read-only
   until incident closure.

Run `./scripts/recovery_rehearsal.ps1` for the safe local proof. It creates two
exact-name temporary PostgreSQL containers, uses only generated `example.test`
fixtures, verifies restored content, and removes all temporary state.
