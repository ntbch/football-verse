# Service Contracts

Date: 2026-08-09
Scope: active public and internal contracts.

## Edge routing

| Public prefix | Owner | Destination | Access |
|---|---|---|---|
| `/api/v1/**` | Gateway | Core API | Core security chain; bearer retained |
| `/matches/**` | Gateway | Prediction | public read |
| `/standings/**` | Gateway | Prediction | public read |
| Socket connection | Gateway | Gateway/Redis realtime | client JWT; validated by Gateway |
| `/health` | Gateway | Gateway | public liveness only |
| `/ready` | Gateway | Gateway/Redis limiter | public readiness; 503 when the required limiter store is unavailable |
| `/metrics` | Gateway | Gateway | `X-Internal-Token` required |
| `/crawl` | Gateway | Content Ingestion | `X-Internal-Token` required |

There are no Career, Match Engine, `/game/**`, or `/api/v1/game/**` contracts.

## Ownership

| Capability | Owner | System of record | Main dependencies |
|---|---|---|---|
| Accounts, roles and refresh sessions | Core API | Core PostgreSQL | Google token verification |
| News, forum, moderation and uploads | Core API | Core PostgreSQL and upload volume | Content Ingestion, Redis notifications |
| Daily minigames and user predictions | Core API | Core PostgreSQL | sports providers, Prediction |
| Premium billing | Core API | Core PostgreSQL | SePay, gated by Core configuration |
| Fixtures, standings and calculations | Prediction | provider/cache | football provider |
| Ingestion spool and checkpoints | Content Ingestion | Ingestion PostgreSQL | approved sources, Core internal API |
| Edge routing, realtime and limits | Gateway | no durable records | Redis, Core, Prediction, Content Ingestion |

No deployable may write another deployable's database.

## Browser and session contract

- Access tokens remain in browser memory; they are not persisted in local or
  session storage.
- Core rotates an HttpOnly refresh cookie. Production requires `Secure` cookies.
- Core persists only a SHA-256 refresh-token hash. Refresh rotates and revokes
  the prior session. Migration `V67` is the expand phase: it invalidates legacy
  sessions and keeps the old column temporarily with hash-only compatibility data.
- Gateway sets `private, no-store` for auth and bearer-authenticated responses.
- Web canonicalizes `/minigame` to `/games` to avoid duplicate content.

## Mutation and recovery expectations

| Command group | Recovery expectation |
|---|---|
| Register, login, refresh, logout | login may be repeated; refresh rotates state; logout revokes when a cookie is present |
| News/forum creation and moderation | reload authoritative state after an ambiguous failure; audit/backup supports operator recovery |
| Prediction/minigame attempts | Core is authoritative; versioned attempts reject stale state |
| Payment orders and webhooks | Core verifies, deduplicates and owns membership transitions; sales remain disabled until release gates pass |
| Crawl/import | ingestion spool and source identity support replay without direct Core database writes |
