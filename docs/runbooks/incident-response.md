# Incident Response and Operational Targets

Date: 2026-07-22

## Initial Targets

| Signal | Target / alert threshold |
|---|---|
| Critical-journey availability | 99.5% monthly |
| Auth and write error rate | alert above 2% for 5 minutes |
| Public read p95 | target below 750 ms; alert above 1 s for 10 minutes |
| Auth p95 | target below 250 ms; alert above 500 ms for 10 minutes |
| Career command p95 | target below 2 s, excluding match simulation |
| Database/upload backup age | alert above 26 hours |
| Durable volume usage | warn at 80%, critical at 90% |

Metrics may use route family, method, status class, service, and dependency.
Never use email, username, user ID, token, save/session ID, URL query, or request
body as a metric label or log field. Keep request IDs random and short-lived.

## Response

1. Assign an incident lead and severity: SEV-1 for security/data loss or total
   critical-journey outage; SEV-2 for major degradation; SEV-3 otherwise.
2. Record UTC start time, affected route family, deploy version, safe request
   IDs, and aggregate symptoms. Rotate any exposed secret immediately.
3. Contain: pause deployment, disable the affected optional worker, or stop
   writes when integrity is uncertain. Do not delete evidence.
4. Mitigate using [deployment-rollback.md](deployment-rollback.md),
   [database-restore.md](database-restore.md), or
   [upload-restore.md](upload-restore.md).
5. Verify with health checks and the relevant generated-data smoke journey.
6. Close only after service recovery, data verification, stakeholder update,
   and a follow-up owner/date are recorded.

The repository defines thresholds but does not invent an alert provider. Wire
these signals to the selected production runtime before launch and test one
dependency failure plus one stale-backup alert each quarter.

## Supply-Chain Response

Dependency review blocks newly introduced high/critical findings and Dependabot
checks locked dependencies plus pinned Docker digests weekly. Patch a confirmed
critical issue within 24 hours, high within 7 days, and moderate within 30 days;
record a risk acceptance with owner and expiry when that is impossible.
