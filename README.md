# Football Verse

Football Verse is a full-stack football community and career-management platform. The repository is organized by deployable so code ownership, data ownership, and verification boundaries stay explicit.

## Start and verify

Prerequisites: Docker Desktop/Engine, Node.js/npm, Java/Maven, and Python with the service development requirements installed.

```powershell
Copy-Item .env.example .env
docker compose up --build
```

The example token is for local development only. Replace `INTERNAL_TOKEN`,
`JWT_SECRET`, database passwords, and OAuth credentials before any public
deployment.

Open the web app at `http://localhost:3000`; the only public API entry point is the Gateway at `http://localhost:8000`.

Run the isolated, data-safe verification matrix from the repository root:

```powershell
./scripts/verify.ps1
```

The verification runner uses temporary databases, uploads, Compose resources, and generated test identities. It does not read or mutate development data. See the [verification runbook](docs/runbooks/baseline-verification.md) for prerequisites and isolation guarantees.

## Deployables

| Deployable | Path and responsibility | Durable data owner | Local build/test |
|---|---|---|---|
| Web | `apps/web/` — Next.js browser UI | none | `cd apps/web; npm ci; npm run build` |
| Core API | `services/core-api/` — identity, users, news, forum, notifications, user predictions | PostgreSQL `football_verse` and Core uploads | `cd services/core-api; mvn test` |
| Gateway | `services/gateway/` — public proxy, JWT edge checks, realtime | none; Redis is transient | `cd services/gateway; npm ci; npm test` |
| Content Ingestion | `services/content-ingestion/` — RSS/API adapters, checkpoints, durable delivery | PostgreSQL `ingestion_db` for operational state; Core owns content | `cd services/content-ingestion; npm ci; npm test` |
| Prediction | `services/prediction/` — provider fixtures, standings, calculations | none | `cd services/prediction; python -m pytest -q` |
| Career | `services/career/` — saves, squads, tactics, transfers, persisted matches | PostgreSQL `match_game_db` | `cd services/career; mvn test` |
| Match Engine | `services/match-engine/` — deterministic match simulation | none | `cd services/match-engine; python -m pytest -q` |

Compose keeps the established runtime service names while source paths use the
topology above. `content-ingestion` runs independently from Gateway and sends
versioned metadata to Core; automated ingestion does not require full article
HTML.

## Public edge routes

The browser talks to the Gateway; services and databases are not public application entry points.

| Gateway route | Owner/destination |
|---|---|
| `/api/v1/**` | Core API; `/api/v1/game/**` is a Career compatibility route |
| `/game/**` | Career |
| `/matches/**`, `/standings/**` | Prediction |
| Socket.IO connection | Gateway realtime with Redis fan-out |

The complete observed route, identity, and service-boundary contract is in [service contracts](docs/architecture/service-contracts.md). Current deployables, owners, verification results, and known risks are in [current state](docs/architecture/current-state.md).

## Documentation map

- Architecture: [current state](docs/architecture/current-state.md), [service contracts](docs/architecture/service-contracts.md), [identity](docs/architecture/identity-contract.md), and [browser auth](docs/architecture/browser-auth-contract.md).
- API and storage: [API reference](docs/API.md) and [database ownership](docs/DATABASE.md).
- Operations: [verification](docs/runbooks/baseline-verification.md), [database restore](docs/runbooks/database-restore.md), [upload restore](docs/runbooks/upload-restore.md), [rollback](docs/runbooks/deployment-rollback.md), [incident response](docs/runbooks/incident-response.md), and [performance baseline](docs/runbooks/performance-baseline.md).
- Change design: active and historical material lives in `docs/plans/`; [project.md](project.md) preserves the original product context and is not the current topology source.

Never put real tokens, credentials, user records, database rows, upload contents, or other private data in tests, fixtures, logs, screenshots, or documentation.
