# Production operations runbook

This runbook is the owner-controlled part of P2. It deliberately does not
contain credentials or destructive commands.

## Required signals

Alert owners must receive alerts for:

- ingestion source failures or crawl-spool lag sustained for 15 minutes;
- authentication 401/403 spikes above the agreed baseline;
- Core API or Gateway availability failures;
- backup job failure, checksum mismatch, or restore rehearsal failure.

Gateway route metrics are available through the protected /metrics route.
Request IDs are safe to correlate across Gateway and Core logs. Normal request
logs must not include email addresses, access/refresh tokens, Redis payloads, or
raw user content.

## Backup and restore evidence

The release owner records the encrypted backup object identifier, checksum,
creation time, retention expiry, and isolated restore target in the release
ticket. Run recovery_rehearsal.ps1 from the repository scripts directory for
the repository-level restore check; production restores must target an isolated
database and must never use the production volume.

## Release checklist

- [ ] Alert destination and on-call owner confirmed.
- [ ] Backup checksum and isolated restore evidence attached.
- [ ] Rollback image digests, deployment manifest, and secret references pinned.
- [ ] Public URL, HTTPS cookie, database, JWT, and internal-token validation
      passed in the production startup environment.
- [ ] Release notes link monitoring, rollback, and restore evidence.
