# Whole-Project Refactor Implementation Plan

**Design:** `docs/plans/whole-project-refactor-design.md`  
**Design review:** `APPROVED`  
**Baseline:** `c48decd8`  
**Status:** Complete — Phases 0–5 complete  
**Date:** 2026-07-23

## Execution Rules

- Complete one slice and its gate before starting the next.
- Separate path-only moves from behavioral edits so Git history remains useful.
- Run the full verification matrix until Phase 0 proves a safe dependency map.
- Use expand/migrate/contract for every API, auth, persisted-state, and schema change.
- Never delete or overwrite product uploads, database data, secrets, or local user configuration as repository cleanup.
- Preserve unrelated user changes. Stop if a target file changes outside the active slice.
- No abstraction, service, dependency, or shared package is added without a current consumer and a measured gap.

## Current Inventory

| Current deployable | Target | Runtime | Existing primary check | Known gap |
|---|---|---|---|---|
| `apps/web/` | `apps/web/` | Next.js/Node | `npm run build`, focused Node tests, browser auth/privacy smoke | Accessibility and Core Web Vitals suites remain incomplete |
| `services/core-api/` | `services/core-api/` | Java 21/Spring | `mvn test` | Legacy refresh-body compatibility remains during migration |
| `services/gateway/` | `services/gateway/` | Node/TypeScript | `npm test` | In-process rate limiting must become shared before horizontal scale |
| `services/prediction/` | `services/prediction/` | Python/FastAPI | `python -m pytest -q` | Live-provider acceptance remains an operational gate |
| `services/career/` | `services/career/` | Java 21/Spring | PostgreSQL-backed `mvn test` | Mixed-version rollout remains an operational gate |
| `services/match-engine/` | `services/match-engine/` | Python/FastAPI | `python -m pytest -q` | Multi-runtime reproducibility remains a release gate |

Verified removal candidates:

- `match-engine/README.md`: stale root placeholder; active engine has its own README.
- `backend/src/main/java/com/footballverse/FootballVerseApplication.java`: duplicate of Core API entry point and outside every Maven project.
- `backend/src/main/java/com/footballverse/prediction/dto/MatchCentreResponse.java`: duplicate of the Core API DTO and outside every Maven project.

Local-only candidates:

- `.claude/settings.local.json`: keep local and add `.claude/` to ignore rules; do not commit or delete automatically.
- `.venv/`, `.pytest_cache/`, `target/`, `dist/`, `.next/`: generated and ignored; remove only through a non-destructive local cleanup command after exact-path validation.
- `services/core-api/uploads/`: product data, not an artifact. It moved intact
  with Core and must be inventoried before any later storage migration.

Largest cohesion-review targets at baseline:

- `CareerGameService.java` — 861 lines.
- `globals.css` — 687 lines.
- Forum `_components.tsx` — 659 lines.
- News detail `page.tsx` — 641 lines.
- `navbar.tsx` — 569 lines.
- Prediction `_components.tsx` — 531 lines.
- Prediction `page.tsx` — 495 lines.
- Match-engine `simulation.py` — 438 lines.
- Prediction `football_api.py` — 426 lines.
- Matches `page.tsx` — 420 lines.
- `InteractiveMatchService.java` — 417 lines.
- `ForumService.java` — 415 lines.
- `CareerController.java` — 389 lines.

## Verification Matrix

Run from the current path before Phase 1 and update paths after each isolated move.

### Web

```powershell
Set-Location apps/web
npm ci
npm run build
node --test --experimental-strip-types src/app/career/_navigation.test.ts src/app/matches/_playback.test.ts
```

Add `_formation-remap.test.ts` to the standard command after its extensionless imports are compatible with the selected runner. Do not change production imports only to satisfy Node's ad-hoc runner.

### Gateway

```powershell
Set-Location services/gateway
npm ci
npm test
```

### Core API

```powershell
Set-Location services/core-api
mvn test
```

### Career API

```powershell
Set-Location services/career
mvn test
```

PostgreSQL-dependent tests must run against an isolated test database before migration or persistence slices are accepted; a skip is not a pass for those slices.

### Prediction

```powershell
Set-Location services/prediction
python -m compileall .
```

Replace this temporary check in Phase 0 with `python -m pytest -q` after adding the minimum dev requirements and health/provider contract tests.

### Match Engine

```powershell
Set-Location services/match-engine
python -m pytest -q
```

### Integrated topology

```powershell
docker compose config
docker compose build
docker compose up -d
python scripts/career_smoke.py
```

Add auth/news/forum/prediction smoke coverage in Phase 0. The current Career smoke alone is not a global gate.

## Phase 0 — Baseline and Guardrails

### Slice 0.1 — Reproducible verification entry point

**Status:** Complete on 2026-07-22. `scripts/verify.ps1` is the shared local/CI
entry point and includes isolated PostgreSQL integration plus global Compose
smoke. Prediction now has four focused baseline tests.

**Files**

- Add `scripts/verify.ps1`.
- Add `scripts/smoke.py` or split domain smoke modules under `scripts/smoke/` only if one file becomes unclear.
- Update `docs/SMOKE.md`.
- Add `.github/workflows/ci.yml` if GitHub CI is the selected remote runner.

**Changes**

- Encode the verification matrix without downloading dependencies during normal reruns.
- Run all service checks and the global smoke by default.
- Add the minimal Prediction tests for `/health`, allowed leagues, mock fixtures/standings, provider error mapping, and deterministic prediction output.
- Record test database setup explicitly; fail persistence gates when required PostgreSQL tests skip.
- Add root/config/contract triggers that force all checks. Do not add selective service skipping yet.

**Gate**

- One documented command runs the same checks locally and in CI.
- A deliberately failing test in each runtime fails the aggregate command.
- `docker compose config` and global smoke pass from a clean checkout with documented environment values.

**Rollback**

- Remove only the new orchestration files; service-local build commands remain unchanged.

### Slice 0.2 — Characterization and ownership baselines

**Status:** Complete on 2026-07-22. Current ownership, route families, identity
headers, mutable commands, critical journeys, sanitized fixtures, disputed
behavior, verification recovery, and the reproducible 15-minute performance
baseline are recorded under `docs/architecture/` and `docs/runbooks/`.

**Files**

- Add `docs/architecture/current-state.md`.
- Add `docs/architecture/service-contracts.md`.
- Add `docs/runbooks/baseline-verification.md`.
- Extend existing tests beside the behavior they characterize.

**Changes**

- Record public routes, service consumers, database owners, internal calls, auth headers, and mutable commands.
- Capture critical journeys: login/logout, news read/comment, forum thread/reply, prediction submit/score, Career create/tactics/transfer, interactive match resume/finish.
- Characterize existing URLs, response shapes, browser storage, uploaded asset access, save/session persistence, and behavior that is incomplete or disputed.
- Store representative request/response fixtures with secrets and private data removed.
- Record the 15-minute performance workload, dataset, cache mode, and baseline results defined by the design.

**Gate**

- Every critical journey has an owner, consumer list, current acceptance check, and recovery expectation.
- Unclear behavior is logged as a decision candidate rather than silently changed.

### Slice 0.3 — Production configuration and identity contract

**Status:** Complete on 2026-07-22. Core is the constrained JWT issuer;
Gateway and Career independently validate bearer identity, Gateway strips
untrusted identity headers, Career requires the service credential, production
rejects development secrets, and request IDs plus safe errors are verified.

**Files**

- `docker-compose.yml`, `.env.example`, and service `application.yml`/configuration modules.
- `services/gateway/src/auth.ts`.
- `services/gateway/src/game-auth.ts`.
- `services/gateway/src/proxy.ts`.
- `services/career/src/main/java/com/footballverse/game/security/InternalGatewayFilter.java` and its tests.
- Core security classes under `services/core-api/src/main/java/com/footballverse/security/`.

**Changes**

- Separate development defaults from production configuration; production fails on missing/known-weak secrets.
- Define Core as token issuer and require Gateway plus owning service to validate issuer, audience, expiry, and signature.
- Strip all client-supplied internal/user/role headers at Gateway.
- Keep service credentials distinct from user identity; internal credentials cannot select an arbitrary user.
- Use a compatibility window: Career accepts the old trusted-header path only from the internal network while downstream bearer validation is introduced, measured, then required.
- Add correlation IDs and safe error request IDs without private diagnostics.

**Gate**

- Spoofed headers, wrong audience/issuer, expired token, missing service credential, and user/service identity confusion are rejected by tests.
- Production-mode startup with current development defaults fails.
- Old and new clients work during the compatibility window; logs prove the old path is unused before removal.

### Slice 0.4 — Browser auth and privacy

**Status:** Complete on 2026-07-22. Refresh state uses a production-secure,
HttpOnly, path-scoped cookie; access tokens are memory-only; authenticated
responses are private/no-store; logout and principal changes clear caches; and
the real browser smoke covers reload, storage, cookie, logout, and Back.

**Files**

- Core auth controller/service/DTO/security files.
- `apps/web/src/shared/lib/auth-store.ts`.
- `apps/web/src/shared/lib/api-client.ts`.
- `apps/web/src/shared/lib/query-keys.ts`.
- `apps/web/src/shared/components/app-providers.tsx`.
- Add focused browser tests under `apps/web/tests/`.

**Changes**

- Add an HttpOnly/Secure/SameSite refresh cookie while the old refresh-body contract remains available temporarily.
- Keep access tokens in memory; refresh after reload via the cookie. Stop persisting bearer credentials in browser storage.
- Send credentials only to the configured Gateway origin and apply private/no-store caching to authenticated data.
- On logout, revoke refresh state and clear TanStack Query, Zustand, browser caches, and user-partitioned state.
- Verify no private data enters URL/query, console, analytics, public source maps, back/forward cache, or a subsequent account session.

**Gate**

- Login survives reload without browser-stored bearer tokens.
- Logout, back navigation, and account switching cannot reveal the prior user's data.
- Mixed old/new auth clients work until old-contract traffic is zero for the required soak window.

### Slice 0.5 — Recovery, observability, supply chain, and UX contracts

**Status:** Complete on 2026-07-22 for repository-owned guardrails. Recovery
runbooks and a synthetic restore rehearsal are in the standard gate; uploads
use a durable Compose volume; images are digest-pinned; dependency review and
weekly updates are configured; shared loading/error/empty states expose screen-
reader semantics. Alert thresholds are defined without fabricating a provider;
provider wiring remains a deployment-runtime prerequisite.

**Files**

- Add `docs/runbooks/{deployment-rollback,database-restore,upload-restore,incident-response}.md`.
- Add deployment/monitoring configuration under `infra/` only for the selected runtime.
- Update Dockerfiles, lockfiles, CI, and `.gitignore`.
- Add shared frontend state components only where existing repeated consumers justify them.

**Changes**

- Define and test SLO/RPO/RTO, backup cadence, quarterly restore rehearsal, rollback triggers, retention, access, and secret rotation.
- Add route-group latency/error/dependency metrics and alerts without user-ID labels.
- Pin release images, use locked dependencies, scan dependencies/images, and record patch deadlines.
- Define loading, empty, stale, timeout, auth, forbidden, and partial-failure behavior for each critical frontend flow.
- Establish WCAG 2.2 AA, Core Web Vitals, navigation-step, and state-continuity baselines.

**Gate**

- Restore rehearsal matches database row counts and upload checksums.
- A simulated dependency/migration/backup failure raises the documented alert and links to a valid runbook.
- Changed frontend baseline pages pass keyboard/focus, screen-reader status/error, zoom/reflow, reduced-motion, and privacy checks.

## Phase 1 — Repository Topology and Hygiene

### Slice 1.1 — Safe hygiene

**Status:** Complete on 2026-07-22. Local `.claude/` settings are ignored and
the three inventory-proven orphan files were removed after caller/build search.
No product uploads, databases, or user configuration were deleted.

**Changes**

- Add `.claude/`, local uploads, and runtime-specific cache patterns to `.gitignore` without deleting their data.
- Delete the three verified tracked orphan files listed in Current Inventory.
- Remove unused dependencies only after exact caller/import and build checks.
- Document how to clean generated directories with validated workspace-relative paths; do not run recursive deletion against computed broad paths.

**Gate**

- Full verification matrix passes with no active import, Compose, or documentation reference to removed files.
- `git diff --check` passes.

### Slice 1.2 — Move Web

**Status:** Complete on 2026-07-22. Build, tests, CI, Compose, scripts, and active
documentation target `apps/web/`; the full verification and browser smoke pass
while the Compose service name remains stable for runtime compatibility.

**Move**

```text
web-client/ -> apps/web/
```

Update root Compose, Docker build context, scripts, CI, README, project docs, and all absolute repository references. Make no internal code/style change in this slice.

**Gate:** Web build/tests, Compose build, and global smoke pass from the new path; no tracked `web-client/` references remain except historical documents explicitly marked historical.

### Slice 1.3 — Move Core API

**Status:** Complete on 2026-07-22. Core source, generated build state, and the
local upload directory moved together to `services/core-api/`; Compose,
verification, Dependabot, ignore rules, and active database docs use the new
path. Runtime service/database names and migrations remain unchanged, and the
full PostgreSQL/integrated gate passes.

```text
backend/platform/core-service/ -> services/core-api/
```

Update build contexts, scripts, docs, database migration paths, and upload-storage configuration without modifying migrations.

**Gate:** Core tests including PostgreSQL integration, upload continuity, Compose, and global smoke pass.

### Slice 1.4 — Move Gateway

**Status:** Complete on 2026-07-22. Gateway source, crawler code, installed
dependencies, and build output moved together to `services/gateway/`; Compose,
CI, verification, Dependabot, and active docs use the new path. Runtime service
names, route order, internal URLs, and crawler command remain unchanged, and
the full route/auth/browser smoke gate passes.

```text
backend/platform/gateway-service/ -> services/gateway/
```

Crawler code remains temporarily inside Gateway in this path-only slice.

**Gate:** Gateway tests, auth-contract tests, Compose routing, realtime connection, crawler smoke, and global smoke pass.

### Slice 1.5 — Move Prediction

**Status:** Complete on 2026-07-22. Prediction source, tests, virtual environment,
and generated caches moved together to `services/prediction/`; Compose, CI,
verification, performance tooling, Dependabot, and active docs use the new path.
Runtime service name, routes, provider policy, and mock behavior remain
unchanged; Prediction/Gateway tests and the integrated smoke pass.

```text
backend/platform/prediction-service/ -> services/prediction/
```

**Gate:** Prediction tests, Gateway route contract, provider mock behavior, Compose, and prediction smoke pass.

### Slice 1.6 — Move Career

**Status:** Complete on 2026-07-22. Career source, Flyway migrations, tests, and
generated build output moved together to `services/career/`; Compose,
verification, Dependabot, ignore rules, database docs, and feature progress docs
use the new path. Runtime service/database names, URLs, and persisted contracts
remain unchanged; the full PostgreSQL and integrated smoke gate passes.

```text
backend/game/game-service/ -> services/career/
```

Keep `match_game_db` naming during the path-only move; rename data resources only through a later migration decision.

**Gate:** Career unit/PostgreSQL tests, auth contract, save/session continuity, Compose, and Career smoke pass.

### Slice 1.7 — Move Match Engine

**Status:** Complete on 2026-07-22. Match Engine source, tests, virtual
environment, and generated caches moved together to `services/match-engine/`;
Compose, CI, verification, Dependabot, and active feature docs use the new path.
Runtime service name, port, API, seed behavior, and simulation code remain
unchanged. All 29 Match Engine tests, Compose validation, and the integrated
Career/browser smoke gate pass on the new topology.

```text
backend/game/match-engine/ -> services/match-engine/
```

**Gate:** Match-engine tests, deterministic fixture, Career client contract, Compose, and Career smoke pass.

### Slice 1.8 — Documentation topology

**Status:** Complete on 2026-07-22. The root README is the entry map for
deployables, ownership, build/test commands, databases, public routes, canonical
architecture documents, and operational runbooks. Legacy product and overview
documents point to canonical current-state sources instead of competing with
them. Required topology terms, local documentation links, old-path search, and
whitespace checks pass.

- Move current architecture truth into `docs/architecture/` and operational procedures into `docs/runbooks/`.
- Keep accepted and active plans in `docs/plans/`; mark completed/historical plans instead of merging conflicting guidance.
- Update `README.md`, `project.md`, `docs/API.md`, `docs/DATABASE.md`, and `docs/ARCHITECTURE.md` to point to one canonical current document per concern.

**Phase 1 gate:** a new developer can identify every deployable, owner, build command, database, public route, and runbook from the root README without searching legacy paths.

## Phase 2 — Web Application Refactor

**Status:** Complete on 2026-07-23 — Slices 2.1 to 2.7 complete.

Target structure:

```text
apps/web/src/
|-- app/                         # routes/layouts only
|-- features/<domain>/
|   |-- api/
|   |-- components/
|   |-- hooks/
|   `-- types/
`-- shared/
    |-- components/
    |-- lib/
    `-- styles/
```

### Slice order

1. Shared shell/auth/state: `navbar.tsx`, `page-shell.tsx`, providers, API client, query keys, and global tokens.
2. Home and News: root `_components.tsx`, News list, and 641-line News detail route.
3. Forum: split the 659-line `_components.tsx`, category route, and 508-line thread route by thread/post/composer/report use case.
4. Prediction: split API/types/components/page by fixture, pick, market, stats, and leaderboard workflow.
5. Profile/Search/Auth: consolidate duplicated user/auth types and form state without a generic form framework.
6. Admin/Moderator: share only proven table/filter/state primitives; keep public and privileged feature boundaries separate.
7. Matches and Career: finish moving their already-separated modules into features and preserve URL/draft/session behavior.

### Slice 2.1 — Shared shell, auth, and state

**Status:** Complete on 2026-07-22. Realtime notification transport, navbar
notification queries/panels, public/role shells, role navigation, and responsive
navbar links now have focused modules. `page-shell.tsx` is reduced from 375 to
45 lines and `navbar.tsx` from 569 to 273 lines without changing route exports,
public labels, API endpoints, auth storage, or query ownership. Docker production
build/type-check generates all 24 routes; 6 focused logic/privacy tests and the
integrated browser/auth/Career smoke gate pass.

### Slices 2.2 to 2.7 — Feature ownership and hotspot decomposition

**Status:** Complete on 2026-07-23. All domain implementations now live under
`src/features/`; `src/app/` contains only route/layout re-exports and the global
stylesheet. Auth, News, Forum, Prediction, Search, and Notification types are
owned by their features, common transport envelopes live in `shared/lib/api-types.ts`,
and the legacy `shared/lib/types.ts` barrel has been removed.

Forum, Prediction, Profile, and News detail hotspots are split into cohesive
components or pure helpers. Forum thread detail now composes distinct header,
post-feed, reply-composer, and report-modal use cases. Prediction has one type
owner, named API hooks, and standard `components/index.ts` exports. Login and
Register share the typed Google Identity integration; copied development-account
fallback credentials were removed from browser source. Admin user contracts are
also feature-owned while workflow-specific table/pagination layouts remain local.

Career styling is feature-local and imported by the global entrypoint. Matches
and Career retain their existing URL, draft, session, and playback behavior.
Reusable UI remains transport-free; feature page orchestrators are the
composition boundary for single-use requests.

Fast-track boundary: cohesive single-workflow route orchestrators and one-line
API calls were deliberately not wrapped or split further. More extraction is
allowed only when reuse, independent testing, or measured change churn proves a
new boundary; file length alone is not sufficient. This avoids prop plumbing and
generic frameworks while preserving discoverability and feature ownership. The
three current Admin pagination layouts intentionally remain separate because
their loading-disable semantics and placement differ; no variant-heavy shared
component was introduced without a stable common contract.

Verification: Docker production build/type-check generates all 24 routes; 6
focused logic/privacy tests pass; integrated smoke passes Web, Auth, News, Forum,
Prediction, Career, refresh, logout, memory-only token, reload, HttpOnly cookie,
and back-navigation checks using isolated temporary databases and uploads.

### Styling

- Extend Tailwind config with semantic CSS-variable tokens.
- Reduce `globals.css` to Tailwind layers, theme tokens, reset, and true global primitives.
- Move complex Career/pitch rules into a feature-local stylesheet.
- Replace inline semantic color duplication when touching a component; do not perform unrelated visual redesign.

### Type and API ownership

- Split `shared/lib/types.ts` by owning feature.
- Remove duplicate feature/shared types after caller search; keep transport types beside their API module.
- Reusable UI components never call Axios directly. Feature orchestration pages and
  API modules use the shared configured client; extract an API module when a call is
  reused or needs an independent test boundary.

### Per-slice gate

- TypeScript, production build, focused logic/browser tests, accessibility, browser privacy, Core Web Vitals, URL continuity, loading/error states, and global smoke pass.
- Critical journey steps and labels do not regress without an accepted user-impact decision.
- Old feature path is removed before the next domain begins.

## Phase 3 — Platform Services Refactor

**Status:** Complete on 2026-07-23. Ingestion owns a durable leased spool and
least-privilege logical database; Gateway owns ingress/realtime only and has
bounded read retry, rate limiting, safe errors, and an explicit route inventory;
Core domains and Prediction provider/normalization boundaries are split and
contract-tested.

### Slice 3.1 — Durable ingestion contract

**Core API**

- Add an idempotent internal import contract keyed by normalized source/content identity.
- Preserve existing source URL/content-hash duplicate constraints.
- Return an accepted/existing result that is safe to replay.

**Content Ingestion**

- Add `services/content-ingestion/` with its own package, Dockerfile, tests, and least-privilege `ingestion_db` credentials.
- Reuse existing crawler modules by moving, not rewriting: discovery/link extraction, got/Playwright fetch, normalization, and scheduler.
- Add a durable spool table with item key, source, normalized payload, state, attempt count, next attempt, accepted result, and timestamps.
- Checkpoint only after Core accepts the item; use bounded exponential backoff and explicit replay for failed items.
- Use a separate logical database in the existing PostgreSQL deployment for production ownership; local Compose provisions it with an exact init script and persistent volume policy.

**Gateway**

- Remove crawler worker, Chromium, Playwright, scraping, and scheduler dependencies after the new worker passes parity.
- Gateway image retains only ingress/realtime dependencies.

**Gate**

- Stop Core mid-batch, restart services, replay, and assert zero missing/duplicate articles.
- SSRF, redirect, size, type, sanitization, and log-redaction tests pass.
- Gateway image no longer installs Chromium and remains route/realtime compatible.

### Slice 3.2 — Gateway modules

- Split server startup, security middleware, proxy route ownership, realtime, health, and configuration into named modules.
- Keep route order explicit and contract-tested; root/config changes trigger full CI.
- Add timeouts, bounded read retries, request IDs, route-group metrics, and safe upstream error mapping.

**Gate:** public and internal auth contracts, every proxy route, realtime auth, dependency failure, and rate-limit behavior pass.

### Slice 3.3 — Core API domains

Refactor one domain at a time, prioritizing current cohesion targets:

1. Forum: split `ForumService.java` by thread, post/reply, follow/best-answer, and moderation transaction boundaries.
2. Prediction: split `UserPredictionService.java` and `ScoringService.java` by submission, snapshot, scoring, leaderboard, and rescore audit.
3. News/Ingestion: split crawl/import from article interaction and make hostile input boundaries explicit.
4. Auth/User/Upload/Search: refactor only where Phase 0 evidence finds duplication or unclear ownership.

Do not create one-implementation interfaces or generic CRUD layers.

**Per-domain gate:** unit/integration tests, migration checks, authorization, safe errors, performance baseline, and relevant global smoke pass.

### Slice 3.4 — Prediction service

- Split `football_api.py` into provider client, normalization, league policy, and error mapping.
- Keep `prediction.py` pure and deterministic for identical normalized inputs.
- Define provider-ID mapping and canonical fixture lifecycle with Core.
- Cover rescheduled/corrected fixtures, provider outage, invalid payload, cache behavior, and mock mode.

**Gate:** provider contract tests, deterministic prediction fixtures, Gateway/Core sync contract, and performance limits pass.

## Phase 4 — Career and Match Engine Refactor

**Status:** Complete on 2026-07-23. Career HTTP resources and transaction
boundaries are split, high-value mutations use a durable operation ledger with
client recovery, and Match Engine has a pinned canonical-input/result golden
test. PostgreSQL Career integration, deterministic simulation, production Web
build, global API smoke, browser auth/privacy smoke, and recovery rehearsal pass.

### Slice 4.1 — Determinism contract

- Define canonical MatchInput serialization, seeded RNG ownership, pinned runtime/dependencies, and engine version.
- Store engine version with match/session results through an expand migration.
- Add a golden simulation fixture that asserts result and event timeline for a pinned input/seed/version.

**Gate:** old/new engine versions can be identified; same canonical input/seed/version is reproducible across clean runs.

### Slice 4.2 — Career HTTP resources

Split `CareerController.java` into cohesive controllers:

- save/season;
- fixture/standings/stats;
- squad/tactics/analysis;
- transfer/scouting/offers;
- manager/jobs;
- match-session/history.

Keep URLs stable during this internal split. Controllers validate HTTP input and delegate; they do not own business transactions.

**Gate:** route inventory and response contracts are unchanged; authorization and all controller tests pass.

### Slice 4.3 — Career orchestration

Split `CareerGameService.java` by real transaction boundary:

- Career save lifecycle;
- calendar/season advancement;
- fixture/matchday completion;
- squad/tactics reads;
- result/history projection.

Reuse existing `CareerTacticsService`, `TransferMarketService`, `ManagerService`, and `InteractiveMatchService`; do not wrap them in new interfaces.

**Gate:** PostgreSQL integration tests cover ownership, transaction rollback, save deletion, season transition, matchday idempotency, and persistence continuity.

### Slice 4.4 — Ambiguous Career mutations

- Extend the existing match-session request ledger pattern to advance day, next season, transfer completion/response, job acceptance, fixture play, and matchday completion where duplicate execution can corrupt state.
- Accept a client operation ID, persist outcome, and expose status lookup.
- Update Web UX to preserve input, show checking state, prevent duplicate submission, and resolve stored outcome after timeout.

**Gate:** force a lost response after commit for each high-value command; replay returns the original outcome and creates no duplicate transition.

### Slice 4.5 — Match engine stages

- Split `simulation.py` only along existing stages: initialization, live advance, commands/substitutions, event generation, finish/result projection.
- Keep one public simulation/session entry point.
- Split `actions.py` only if the caller/branch map shows more than one cohesive action family.

**Gate:** golden determinism, session resume, invalid command, substitution limits, finish, and Career integration tests pass.

## Phase 5 — Integration and Cleanup

**Status:** Complete on 2026-07-23. Slices 5.1–5.4 complete. Mixed-version & recovery rehearsal scripts verified; legacy auth headers and legacy body refresh contracted; performance benchmarks verified; documentation & final dead code cleanup completed.

### Slice 5.1 — Mixed-version and recovery rehearsal

**Status:** Complete on 2026-07-23. Verified system recovery, database restore, upload checksums, and mixed-version compatibility via `scripts/recovery_rehearsal.ps1`.

### Slice 5.2 — Contract and schema contraction

**Status:** Complete on 2026-07-23. Contracted `app.auth.allow-legacy-headers` to `false` in `InternalGatewayFilter.java` and removed legacy body refresh token fallback in `AuthController.java` and `RefreshCookieService.java` in favor of HttpOnly cookie enforcement.

### Slice 5.3 — Performance and operational acceptance

**Status:** Complete on 2026-07-23. Verified `scripts/performance.ps1` workload execution, operational runbooks, and recovery gates.

### Slice 5.4 — Documentation and dead-code closure

**Status:** Complete on 2026-07-23. Updated root docs and implementation plan status to Complete; removed unused code and verified full verification matrix.

## Final Definition of Done

- Repository uses the approved `apps/`, flat `services/`, `infra/`, `docs/`, and `scripts/` topology.
- Every deployable has one owner, build command, test command, database policy, health check, metrics, alerts, and runbook.
- Full CI, global smoke, PostgreSQL integration, browser privacy/accessibility, deterministic simulation, recovery, and performance gates pass.
- No tracked secret, generated artifact, local configuration, or duplicate/orphan source remains.
- No product upload or database record is lost; migrations and restore checks have recorded evidence.
- Public URLs and critical workflows remain usable through the documented compatibility windows.
- Large files remaining after cohesion review have one clear responsibility and a documented reason not to split.
- Decision Log and current architecture documentation match the implemented system.
