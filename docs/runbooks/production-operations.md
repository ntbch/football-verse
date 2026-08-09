# Production operations runbook

This runbook is the owner-controlled part of P2. It deliberately does not
contain credentials or destructive commands.

## Required signals

Alert owners must receive alerts for:

- ingestion source failures or crawl-spool lag sustained for 15 minutes;
- authentication 401/403 spikes above the agreed baseline;
- Core API or Gateway availability failures;
- backup job failure, checksum mismatch, or restore rehearsal failure.

Gateway route metrics are available through `/metrics` with `X-Internal-Token`.
Use `/health` for liveness and `/ready` for readiness; `/ready` returns 503 when
the production Redis-backed rate limiter cannot be reached.
Request IDs are safe to correlate across Gateway and Core logs. Normal request
logs must not include email addresses, access/refresh tokens, Redis payloads, or
raw user content.

The Compose ngrok service is development-only (`--profile dev`) and its
inspector binds to loopback. It must not be used as the production ingress.
When a reverse proxy fronts Gateway, set `TRUST_PROXY_HOPS` to its exact depth;
production rate limiting requires Redis (`RATE_LIMIT_STORE=redis`).

## Refresh-token hash rollout

`V67` is deliberately an expand migration. It revokes legacy sessions and
replaces their stored plaintext with non-secret sentinels, but retains the old
column temporarily so an older Core instance cannot fail during a rolling
deployment. Deploy the application version that writes hashes to both columns,
wait until every old Core instance has stopped, then schedule a separate
contract migration to drop the legacy column. Do not combine that contract step
with a rolling deployment.

## Premium billing guardrails

Billing is deployed with `BILLING_ENABLED=false` and
`BILLING_SALES_ENABLED=false` until product/legal approval, SePay credentials,
public IPN reachability, and Sandbox evidence are attached to the release.
Monitor webhook 401s, review-required mismatches, duplicate events, stuck
pending orders, reconciliation outcomes, and payment-to-membership latency.
Never enable sales by changing only the Web flag; Core owns the kill switch,
price catalog, IPN verification, and membership grant.

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
- [ ] Web CSP report-only findings are clean; set `CSP_ENFORCE=true` only after
      the approved third-party origins are confirmed.
- [ ] Release notes link monitoring, rollback, and restore evidence.
