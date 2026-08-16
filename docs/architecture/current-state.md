# Current State

Date: 2026-08-16
Scope: active deployables and repository-owned release controls.

## Active deployables

| Deployable | Path | Responsibility | Data owner |
|---|---|---|---|
| Web | `apps/web/` | Browser UI, route state, CSP response header | none |
| Core API | `services/core-api/` | Accounts, news, forum, minigames, predictions, billing and notifications | `football_verse` PostgreSQL |
| Gateway | `services/gateway/` | Public routing, edge controls, Redis-backed rate limits and realtime | Redis transient state |
| Content Ingestion | `services/content-ingestion/` | Approved RSS/API ingestion, spool and delivery | `ingestion_db` PostgreSQL |
| Prediction | `services/prediction/` | Provider fixtures, standings and calculations | provider/cache only |

Career and Match Engine are retired; they are not active deployables or supported
route families.

## Repository-owned safety controls

- Core stores only SHA-256 hashes of refresh tokens. Migration `V67` revokes all
  pre-existing sessions and removes the former plaintext column.
- Core test configuration disables scheduling. Scheduler behavior must be tested
  explicitly rather than making external calls during application-context tests.
- Gateway uses Redis rate-limit state in Compose and rejects the process-local
  limiter in production. `TRUST_PROXY_HOPS` must be set to the exact proxy depth
  when a reverse proxy is introduced.
- `/health` is a minimal public liveness response. `/metrics` requires
  `X-Internal-Token`.
- The ngrok tunnel is a `dev` Compose profile and its inspector binds to loopback.
- Web CSP remains report-only until the release owner has reviewed production
  reports and approved all third-party origins.

## Local verification snapshot

| Check | Result |
|---|---|
| Web lint | pass with warnings; no lint errors |
| Web typecheck | pass |
| Web tests | 7/7 pass |
| Gateway tests | 19/19 pass in a loopback-capable environment |
| Content ingestion tests | 8/8 pass |
| Prediction tests | requires the service Python test dependency |
| Core Maven tests | pass; scheduling is now disabled for the test profile |
| Compose syntax | `docker compose config --quiet` pass |

The Web production build and complete Core/Prediction verification require the
documented local Node, Maven, and Python dependencies. A missing prerequisite is
not a green verification result.

## Release gates outside this repository

- Alert destination and on-call ownership.
- Encrypted backup checksum and isolated restore rehearsal evidence.
- Pinned image digests, manifest, secret references and rollback plan.
- CSP report-only evidence before setting `CSP_ENFORCE=true`.
- Billing legal/product approval, SePay Sandbox evidence and public IPN reachability.

Run repository checks with:

```powershell
./scripts/verify.ps1
```
