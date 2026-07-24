# Deployment and Rollback

Date: 2026-07-22  
Target: current Docker Compose deployment; adapt the commands when a managed
runtime is selected.

## Release Gate

1. Build from a tagged commit with no local changes.
2. Run `./scripts/verify.ps1`; a skipped or failed suite blocks release.
3. Confirm the database and `core_uploads` backups are current and restorable.
4. Record deployed commit, image digests, Flyway versions, operator, and time.
5. Deploy with `docker compose config --quiet` followed by the approved Compose
   command. Never put secrets on the command line or into the release record.

## Rollback Triggers

Rollback when authentication or a critical journey is unavailable, the 5xx
rate exceeds 2% for five minutes, data checks fail, or a migration prevents the
previous application version from reading its owned database.

## Procedure

1. Stop further deployments and capture request IDs, timestamps, image digests,
   and health results. Do not copy request bodies, tokens, emails, or DB rows.
2. If no data corruption occurred, redeploy the last verified application
   images. Do not reverse Flyway migrations; releases must remain compatible
   with the expanded schema.
3. Run the global smoke and the affected critical journey.
4. If data is corrupt, keep writes stopped and follow
   [database-restore.md](database-restore.md) and/or
   [upload-restore.md](upload-restore.md). A data restore requires incident-lead
   approval because it can discard writes after the selected recovery point.
5. Record outcome and open follow-up work before resuming deployment.

Target application rollback time is 30 minutes. Database or upload recovery has
the separate four-hour RTO documented below.
