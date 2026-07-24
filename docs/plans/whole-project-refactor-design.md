# Whole-Project Refactor Design

Status: Review-approved  
Date: 2026-07-22  
Baseline: `c48decd8` (`fix: career logic and update ui`)
Arbiter disposition: `APPROVED`  

## Understanding Summary

- Refactor the whole repository: frontend, backend services, match engines, database migrations, Docker Compose, documentation, and development tooling.
- Improve all three problem areas: code organization, architectural consistency, and repository/dependency hygiene.
- Optimize for reading, searchability, maintenance, and future extension rather than preserving accidental structure.
- Allow API, schema, behavior, and service-boundary changes only through a compatibility window that supports mixed versions and rollback.
- Deliver incrementally; every phase must leave the system runnable, testable, and recoverable.
- Target a real small-to-medium production product now while keeping clean domain boundaries for larger scale and more teams later.
- Do not add speculative features. Only complete existing unfinished behavior and fix defects found during the refactor.

## Assumptions

- The committed baseline is the source of truth; existing plans describe intent but do not override working behavior.
- One developer plus AI maintains the repository today; ownership may later be split across teams.
- Microservices are not mandatory. A service remains separate only when domain ownership, runtime, security, or deployment needs justify it.
- A phase may intentionally replace an API or schema, but production rollout follows expand/migrate/contract; old and new consumers coexist until cutover is verified.
- No user data, credentials, tokens, internal headers, or private payloads may leak through responses, logs, source control, or build artifacts.
- Generated output, caches, virtual environments, and local agent configuration are disposable. User uploads are product data and require migration, integrity checks, retention, and backup before any local upload directory is removed.

## Current-State Findings

- The baseline repository had useful service boundaries but inconsistent top-level placement: historical `web-client/`, `backend/platform/*`, and `backend/game/*`.
- At baseline, root `match-engine/` was a stale placeholder while the active
  engine lived under historical `backend/game/match-engine/`; the active path is
  now `services/match-engine/`.
- `backend/src/` is an orphaned partial source tree and must be checked for consumers before removal.
- The gateway package also contains crawler dependencies even though the crawler already runs as a separate process.
- Several files combine unrelated responsibilities, including large Career orchestration/controller files, simulation code, route pages, shared navigation, and global CSS.
- Frontend styling mixes Tailwind utilities, inline styles, semantic CSS variables, and feature-specific rules in a large `globals.css`.
- Existing ownership documentation already separates `core_db` and `match_game_db`; that boundary remains valid.

## Target Repository Structure

```text
football-verse/
|-- apps/
|   `-- web/
|-- services/
|   |-- core-api/
|   |-- gateway/
|   |-- content-ingestion/
|   |-- prediction/
|   |-- career/
|   `-- match-engine/
|-- infra/
|-- docs/
|   |-- architecture/
|   |-- plans/
|   `-- runbooks/
|-- scripts/
|-- docker-compose.yml
`-- README.md
```

The structure is deliberately flat at the service level so developers can find an owner without first understanding internal platform/game categories. No shared `packages/` directory is created until real cross-project reuse exists.

## Service Ownership

### Web

Owns browser rendering, user interaction, route state, and client-side server-state integration. It contains no business truth and reaches product APIs only through the gateway.

### Gateway

Owns public ingress, routing, CORS, rate limiting, first-pass JWT verification, and realtime fan-out. It strips all client-supplied identity and internal-auth headers and contains no domain persistence or crawler implementation.

### Content Ingestion

Owns RSS/HTML discovery, extraction, normalization, durable delivery state, and import calls into Core API. It remains Node-based for the existing scraping ecosystem but is built and deployed independently from the public gateway.

### Core API

Owns authentication, token issuance, users, news, forum, moderation, notifications, upload metadata, and user-owned real-match predictions. It is the only service that reads or writes `core_db`.

### Prediction

Owns external football-provider integration, real fixtures/standings inputs, and calculations that do not depend on user identity. It does not own Career state.

### Career

Owns Career saves, clubs, squads, tactics, transfers, schedules, standings, match history, and `career_db` (currently `match_game_db`). Core user IDs remain external references with no cross-database joins.

### Match Engine

Owns deterministic simulation from immutable input, seed, and engine version. It has no user authentication or product database. Interactive session state is persisted by Career; the engine only transforms simulation state.

## Data Flow and Contracts

```text
Browser -> Gateway
             |-- Core API -> core_db
             |-- Prediction
             `-- Career -> career_db -> Match Engine

Content Ingestion -> Core API internal import endpoints
```

- Services access only their own databases.
- Cross-service references use stable IDs, lifecycle rules, and explicit HTTP contracts.
- Redis is limited to cache, rate limiting, and realtime fan-out; it is never the source of business truth.
- Synchronous HTTP remains the default. A broker is added only after a measured reliability or throughput need.
- Reads may use bounded retries with timeouts. Mutating commands that can be submitted twice use a client operation ID persisted with the result; after an unknown timeout the caller can query that result instead of repeating the mutation blindly.
- Core is the identity authority. Externally initiated requests carry the original signed token downstream; each owning service validates signature, issuer, audience, expiry, and authorization. Internal service credentials identify only the calling service and cannot impersonate a user without a separately validated user token.
- Gateway removes `Authorization` replacements, user/role headers, and internal-token headers supplied by the client before applying trusted routing policy.
- Content Ingestion persists normalized items in its own durable spool using a stable source/content idempotency key. It checkpoints a source only after Core accepts the item, retries with bounded exponential backoff, and exposes failed items for safe replay. Core's import endpoint enforces the same idempotency key so replay cannot duplicate content.

## Compatibility, Migration, and Recovery

- API and schema changes use expand/migrate/contract: add the new shape, deploy compatible readers/writers, migrate and verify data, move consumers, then remove the old shape in a later deploy.
- Application rollback is supported while both shapes remain valid. Destructive contraction is not called reversible; it occurs only after the compatibility window, backup verification, and restore rehearsal.
- Data transformations use shadow columns/tables or resumable batches with row counts and checksums. New-version writes must not make old-version rollback unsafe.
- Flyway files already applied in a shared environment remain immutable. A forward repair migration is used when correction is required.
- Product uploads live in persistent storage outside the repository. Moving local uploads requires an inventory, checksum comparison, metadata reconciliation, and verified backup; they are never deleted as build artifacts.
- Contract removal requires a complete consumer inventory, migration row counts/checksums, successful staging rollback of the old application against the expanded schema, and at least seven days with no observed old-contract traffic. Any verification mismatch blocks contraction.

## Internal Code Organization

### Web

```text
apps/web/src/
|-- app/                    # thin Next.js routes and layouts
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

Route files compose workflows; API calls and domain state live in features. Generic `_components.tsx`, `helpers`, and dumping-ground `utils` files are replaced by names that describe real use cases.

Tailwind is the default styling mechanism. Semantic colors, spacing, radii, and typography map to the existing CSS variables through Tailwind configuration. `globals.css` retains tokens, reset, and truly global primitives. CSS Modules are reserved for complex scoped visuals such as the Career workspace and football pitch. Styling is migrated only in files already being refactored or rules moved out of `globals.css`; visual redesign is out of scope.

### User Experience Continuity

- Existing public URLs, bookmarks, authenticated sessions, uploaded assets, Career saves, and in-progress match sessions remain usable through mixed-version rollout and rollback. A changed URL keeps a compatibility redirect for the migration window.
- Phase 0 records the current step count, navigation label, loading/empty/error behavior, and recoverable draft/state behavior for each critical journey. Refactor acceptance does not increase steps or remove recovery without an explicit user-impact decision.
- Forms preserve entered data across recoverable auth, timeout, and dependency failures. Existing persisted drafts remain readable through their compatibility window.
- A mutation with an unknown outcome shows `Checking status`, disables duplicate submission for its operation ID, preserves user input, and resolves through status lookup. It never reports a definite failure until the owning service confirms failure.
- Every data view defines loading, empty, stale, timeout, unauthorized, forbidden, and partial-dependency states with a clear next action. Safe errors may show a copyable request ID but never private diagnostics.
- Behavior-change decisions record visible impact, state/data migration, recovery behavior, and user acceptance checks.

### Accessibility

- Refactored UI meets WCAG 2.2 AA for keyboard operation, visible focus, semantic labels, screen-reader status/error announcements, contrast, form error association, 200% zoom/reflow, and reduced motion.
- Focus returns to a logical element after dialogs, route transitions, mutations, and validation failures. Loading updates do not steal focus.
- Each frontend slice includes automated checks available in the current toolchain plus a short keyboard, screen-reader, zoom, and reduced-motion verification for changed critical flows.

### Java

Packages remain domain-first, then controller/service/repository/dto. Large controllers split by HTTP resource; large services split by cohesive use case and transaction boundary. No base service, mapper layer, interface, or factory is introduced for a single implementation.

### Python

Modules separate API adapters, domain models, providers, and calculation/engine stages. The match engine keeps one obvious simulation entry point while internal phases remain independently testable.

### Node

Gateway modules follow ingress capabilities. Content ingestion modules follow discovery, extraction, normalization, and delivery. Shared presentation-only code may be copied when trivial; authentication, authorization, validation, redaction, money, persistence, and protocol logic must keep one explicit owner. A package is extracted only after repeated, stable reuse exists.

## Non-Functional Requirements

### Performance and Scale

- Optimize for approximately 10,000 registered users and an initial verification workload of 50 concurrent active users without blocking horizontal scaling.
- Record baseline latency and payload size for critical routes before changing them.
- Initial budgets are p95 <= 500 ms for cached/public reads, p95 <= 1 s for ordinary writes, 5xx < 1% during the verification run, and <= 1 MB JSON responses except explicit downloads. Phase 0 may revise a budget when the measured baseline and product flow justify it.
- Keep services stateless where practical and avoid cross-database request chains.
- Phase 0 records a reproducible 15-minute workload with 70% public reads, 20% authenticated reads, and 10% writes against at least 10,000 users, 50,000 articles, 100,000 forum posts, and 100,000 predictions. Results distinguish cold and warm caches.
- Match simulation is measured separately with a provisional p95 <= 3 seconds per complete simulation. Ingestion is measured as a 100-item batch with provisional completion <= 60 seconds when Core is healthy; Phase 0 may revise either limit from evidence.
- Browser budgets at the 75th percentile are LCP <= 2.5 seconds, INP <= 200 ms, and CLS <= 0.1 on a representative mid-tier mobile profile and slow 4G network. Critical interaction steps are measured before and after each frontend slice.

### Security and Privacy

- Never expose secrets, private payloads, internal identity headers, or stack traces.
- Redact tokens, email addresses, and private fields from structured logs.
- Validate every external input at its trust boundary and enforce authorization in the owning service.
- Production startup fails closed when required secrets are missing, use known development defaults, or fail minimum-strength checks. Development defaults are explicitly development-only.
- Keep secret values outside source control and build output; CI scans tracked content and built artifacts for configured secret patterns.
- Public ingress is gateway-only; internal services are not publicly exposed.
- Ingestion blocks private/link-local destinations, limits redirects/body size/content type, sanitizes stored rich content, and never logs fetched credentials or raw private payloads.
- Production traffic uses TLS at every network hop. Databases, product uploads, and backups use platform encryption at rest; backup/export transport is encrypted.
- Each service receives a distinct least-privilege database and service credential. No service uses the PostgreSQL owner/superuser account at runtime.
- Secrets are rotated at least every 90 days and immediately after suspected exposure. Rotation supports overlap so running instances can move without downtime.
- Production logs are access-controlled and retained for 30 days by default; security/audit records are retained for 90 days. Backups are retained for 30 days. User-data deletion removes or irreversibly anonymizes data according to the owning domain's documented retention rule, including derived exports when feasible.
- Sensitive data is forbidden from URLs/query strings, browser console logs, analytics payloads, public source maps, and shared Next.js caches. Authenticated server responses use private/no-store caching where appropriate.
- Refresh credentials use `HttpOnly`, `Secure`, and appropriate `SameSite` cookies in production; bearer tokens are not persisted in `localStorage` or `sessionStorage`. Logout clears client query/state caches, invalidates the refresh credential, and leaves no private data available through back/forward cache or another account session.

### Supply Chain

- Commit language lockfiles and build from locked dependencies. Release container bases are pinned by digest and produce an immutable image tag.
- CI scans application dependencies and release images; a critical exploitable finding blocks release unless an explicit time-bounded exception is recorded.
- Critical security patches are triaged within 24 hours and resolved within 7 days; high severity findings are resolved within 30 days.

### Reliability and Recovery

- Use transactions for multi-write business operations.
- Flyway migrations are immutable after release and follow the compatibility/recovery policy above.
- Propagate a correlation ID across services and return a safe request ID in errors.
- Each phase maintains health checks, critical smoke paths, and an explicit rollback point.
- Initial production SLO is 99.5% monthly availability for Gateway, Core API, and Career critical routes, excluding announced maintenance. Error-budget exhaustion freezes non-reliability releases.
- PostgreSQL uses daily full backups plus continuous recovery logs for an RPO <= 15 minutes and RTO <= 4 hours. Upload storage follows the same RPO/RTO. Restore is rehearsed at least quarterly and must reproduce row/object counts and checksums in an isolated environment.
- A deployment rolls back when a critical smoke path fails, migration verification differs, or 5xx exceeds 2% for 5 minutes. Data incompatibility stops rollout and invokes the documented recovery path rather than an unsafe reverse migration.

### Observability

- Every service reports request count, p50/p95/p99 latency, 4xx/5xx, saturation, dependency latency/failure, and health by route group without high-cardinality user labels.
- Alerts cover SLO burn, sustained 5xx/latency, authentication abuse/rate limiting, unavailable dependencies, failed migrations, failed backups, and stalled ingestion delivery.
- Alert thresholds, owner, severity, and runbook link are versioned with deployment configuration. A production phase is incomplete until its new critical path is represented in metrics and a runbook.

### Maintenance

- Prefer direct, boring code and existing platform features.
- A file above roughly 250 lines triggers a cohesion review, not automatic splitting.
- Shared code requires multiple real consumers.
- Architecture and runbooks describe current behavior, not speculative future systems.

## Delivery Phases

### Phase 0: Baseline, Security, and CI Guardrails

- Capture build, unit, integration, and smoke commands for each service.
- Record critical route, dependency, data ownership, contract, and performance baselines.
- Add characterization checks for disputed or undocumented behavior; a behavior changes only through an explicit decision and updated acceptance check.
- Capture browser storage/cookie/cache/source-map exposure and continuity baselines for URLs, sessions, forms, uploads, Career saves, and active matches.
- Make production configuration fail closed, define the identity/header contract, fix source-control exclusions, and verify secret/log redaction.
- Establish SLO/RPO/RTO dashboards, alerts, backup/restore checks, locked dependency scans, and the reproducible performance workload.
- Run the full suite until the dependency map is proven. Selective CI is enabled later only when root/config/contract changes correctly trigger all affected services; a global smoke path always runs.

### Phase 1: Repository Topology and Hygiene

- Phase 1a removes verified generated artifacts, dependencies, placeholders, and orphans without moving active code.
- Phase 1b moves one deployable at a time into `apps/` or `services/` with a history-preserving rename and no behavioral edits.
- Each move updates Compose, scripts, docs, and CI references in the same commit; root Compose remains the convenient entry point.
- Product uploads are inventoried and migrated separately under the compatibility/recovery policy.

### Phase 2: Web Application

- Refactor one user domain at a time into feature modules and keep routes thin; remove the old path before starting the next domain.
- Split oversized pages/components by workflow and state ownership.
- Configure semantic Tailwind tokens and reduce global/inline styling.
- Enforce the accessibility, user-state, error-state, browser-privacy, responsive, and browser-performance contracts while refactoring.

### Phase 3: Platform Services

- Phase 3a establishes idempotent Core import, the durable ingestion spool, checkpoint/retry/replay checks, then extracts content ingestion from gateway source and dependencies while preserving its import contract.
- Later slices refactor Gateway, Core API, and Prediction one domain/use case at a time.
- Prediction sync assigns an internal canonical fixture ID. Core stores the provider mapping and immutable fixture/result snapshot used for each prediction score; corrections create a new result version and an explicit rescore audit record.

### Phase 4: Game Services

- Refactor Career in independent save, season, squad/tactics, transfer, and match-session slices.
- Define deterministic input as canonical serialized data plus seed, pinned runtime/dependencies, and engine version. Store the engine version with results and keep a golden simulation check before splitting stages.
- Verify persistence, migrations, and interactive match recovery.

### Phase 5: Integration and Performance Cleanup

- Run all critical user journeys through the deployed topology.
- Compare performance and payload baselines.
- Remove temporary compatibility paths and obsolete documentation.
- Finalize architecture, operations, migration, and recovery runbooks.

Security, observability, testing, and rollback are guardrails from Phase 0 onward, not work deferred to Phase 5.

## Verification Strategy

- Unit tests cover branching domain logic and deterministic calculations.
- Database integration tests cover transaction, migration, ownership, and destructive-edge cases.
- Contract tests cover Gateway-to-service routing, identity propagation, and safe errors.
- A small smoke suite covers login, news/forum reads and writes, prediction submission, Career creation, tactics, and match completion.
- Continuity checks exercise old URLs, an existing login session, an uploaded asset, a saved Career, and an in-progress match before and after mixed-version deploy and rollback.
- Mutation checks simulate a response timeout after commit and assert that the UI preserves input, prevents duplicate submission, checks status, and reports the stored result.
- Frontend checks cover keyboard/focus, screen-reader status and form errors, contrast, zoom/reflow, reduced motion, and every defined loading/empty/stale/auth/partial-failure state on changed flows.
- Browser privacy checks cover storage, cookies, URLs, console output, Next caches, public source maps, logout, browser back/forward cache, and account switching.
- Redaction checks assert that representative error/log paths contain no token, email, private payload, or internal identity header.
- Ingestion security checks cover SSRF targets, redirect limits, oversized bodies, invalid content types, and active-content sanitization.
- Ingestion delivery checks stop Core mid-batch, restart both sides, replay the spool, and assert no missing or duplicate imports.
- Recovery checks restore database and upload backups into an isolated environment and compare expected counts/checksums.
- Compatibility checks run the old and new consumer against the expanded schema/contract before any contraction.
- Existing frameworks and native build tools are reused; no new test platform is introduced without a demonstrated gap.

## Key Risks and Mitigations

- **Large move obscures history:** use isolated rename commits before behavioral edits.
- **API consumers drift:** update gateway, web, and contract checks in the same phase.
- **Mixed versions disagree:** keep expand/migrate/contract compatibility until every consumer and rollback path is verified.
- **Migration loses data:** use shadow data, checksums, backup restore rehearsal, and delayed destructive contraction.
- **Unknown write outcome:** persist operation IDs/results for high-value commands and provide status lookup.
- **Uploads are mistaken for artifacts:** inventory and migrate product data separately from repository cleanup.
- **Over-abstraction:** require real multiple consumers before extracting shared code.
- **Partial refactor creates two patterns:** complete one domain slice at a time and remove its old path before starting the next.
- **Sensitive data leaks during observability work:** use allow-listed log fields and tests for redaction.
- **Dependency or image compromise:** lock dependencies, pin release images, scan in CI, and enforce patch deadlines.
- **Crawler loses data during Core outage:** persist a deduplicated spool and checkpoint only after acceptance.
- **Backup exists but cannot restore:** rehearse recovery quarterly and verify counts/checksums against the stated RPO/RTO.
- **Browser retains private data:** audit every browser storage/cache surface, use secure cookies/no-store, and verify logout plus account switching.
- **Migration breaks a user's active flow:** run continuity checks for URLs, sessions, drafts, uploads, saves, and active matches during mixed-version deployment and rollback.
- **Unknown mutation result causes duplicate action:** keep the operation ID, preserve input, query status, and avoid definitive failure messaging until confirmed.
- **Refactor silently reduces accessibility:** enforce WCAG 2.2 AA checks on each changed frontend flow.

## Decision Log

1. **Whole-repository scope.** Alternatives were source-only or Career-only cleanup. Whole scope was chosen because repository, service, and UI disorder reinforce each other.
2. **Domain-first incremental approach.** Alternatives were backend consolidation first and a parallel clean-room rewrite. Incremental slices provide safer checkpoints and faster visible cleanup.
3. **Flat `apps/` and `services/` topology.** Keeping the current nested topology minimizes moves but is harder to navigate and assign to future teams.
4. **Retain only justified service boundaries.** A modular monolith remains a valid outcome for same-runtime modules. Phase 0 must verify independent data ownership, runtime/security needs, or deployment cadence before a boundary is treated as permanent; language alone is insufficient evidence.
5. **Separate content ingestion from gateway.** The crawler already runs separately; extraction removes browser automation dependencies from the public ingress image and attack surface.
6. **Gateway-only public boundary.** Direct browser-to-service access was rejected to centralize security, routing, and identity propagation.
7. **Database per owning domain.** Cross-database joins were rejected to preserve service independence and data authority.
8. **HTTP before messaging.** A broker was rejected until measured throughput or reliability needs justify its operational cost.
9. **Feature/domain-first internal organization.** Generic shared layers and speculative abstractions were rejected in favor of discoverable use-case ownership.
10. **Tailwind plus scoped CSS Modules.** Continuing the current unstructured mix or rewriting every style into one mechanism was rejected; the chosen split gives semantic consistency without forcing complex visuals into unreadable class strings.
11. **Production guardrails begin in Phase 0.** Deferring security and observability until final hardening was rejected because every intermediate phase must be safe and operable.
12. **Use rolling-compatible changes.** The earlier assumption that all consumers could ship atomically was rejected; expand/migrate/contract supports mixed versions and rollback.
13. **Revalidate identity at the owning service.** A shared internal credential that could impersonate users was rejected; Core-issued user identity and service identity remain distinct.
14. **Treat uploads as product data.** Grouping uploads with disposable artifacts was rejected because it could authorize data loss.
15. **Persist idempotency for high-value writes.** Merely avoiding automatic retries was rejected because clients can retry after unknown outcomes.
16. **Make phase slices smaller than service groups.** Repository, platform, frontend, and game phases are umbrellas containing independently runnable slices.
17. **Constrain styling migration.** Styling changes occur only with touched components or global-rule extraction; visual redesign is not part of the refactor.
18. **Make production constraints measurable.** Added initial SLO, RPO, RTO, retention, encryption, rotation, metrics, alerts, and rollback triggers; Phase 0 may adjust performance budgets only with recorded evidence.
19. **Give ingestion durable at-least-once delivery.** A service-owned spool plus idempotent Core import was chosen so outage recovery neither loses nor duplicates articles.
20. **Require contraction evidence.** Old contracts remain until consumer inventory, checksums, soak, and old-version rollback verification all pass.
21. **Set minimum supply-chain controls.** Locked dependencies, pinned release images, scanning, and patch deadlines are release requirements.
22. **Protect browser-side privacy.** Server redaction alone was rejected; browser storage, cookies, URLs, logs, caches, source maps, logout, and account switching are explicit trust surfaces.
23. **Preserve active user state through rollout.** API compatibility alone was rejected; URLs, sessions, forms, uploads, Career saves, and active matches receive continuity checks.
24. **Define uncertain-mutation UX.** A timeout is treated as unknown, not failed, until operation-status lookup resolves it.
25. **Make accessibility testable.** A generic preservation statement was rejected in favor of WCAG 2.2 AA acceptance checks on changed flows.

## Review Objections and Resolutions

- **Atomic breaking deployment:** accepted. Replaced with rolling-compatible expand/migrate/contract.
- **Unmeasurable privacy promises:** accepted. Added fail-closed production configuration, secret/redaction checks, and ingestion trust-boundary checks.
- **Ambiguous identity propagation:** accepted. Core is the issuer; gateway and owning service validate user tokens, while service credentials cannot impersonate users.
- **Destructive migration rollback claim:** accepted. Destructive contraction is delayed and restore is rehearsed; reverse migration is not promised.
- **Uploads grouped with artifacts:** accepted. Uploads are explicitly product data.
- **Oversized phases:** accepted. Each phase now contains smaller independently runnable slices.
- **Unknown write outcomes:** accepted. High-value commands persist operation IDs and results.
- **No behavioral oracle:** accepted. Phase 0 adds characterization checks and requires explicit decisions for behavior changes.
- **Prediction lifecycle ambiguity:** accepted. Canonical fixture IDs, snapshots, result versions, and rescore audit records define authority.
- **Undefined determinism:** accepted. Canonical input, pinned runtime, engine version, and golden checks define reproducibility.
- **Unsafe selective CI:** accepted. Full CI remains until the dependency map proves safe selection.
- **Hostile ingestion:** accepted. Explicit SSRF, redirect, size, type, sanitization, and log constraints were added.
- **Vague scale target:** accepted. Initial concurrency, latency, error, and payload budgets were added and may be revised from measured Phase 0 evidence.
- **Service-boundary YAGNI:** accepted in part. Boundaries are provisional until Phase 0 verifies a non-language justification.
- **Repository rename YAGNI:** rejected. Discoverability is an explicit user goal; risk is controlled through isolated per-deployable rename commits.
- **Styling rewrite risk:** accepted. Migration is constrained and excludes visual redesign.
- **Unsafe trivial duplication:** accepted. Security, validation, persistence, and protocol logic must retain one owner.
- **Missing encryption/access/retention controls:** accepted. Added TLS, encryption at rest, least-privilege credentials, rotation, access, retention, and deletion requirements.
- **Missing availability/recovery targets:** accepted. Added 99.5% SLO, 15-minute RPO, four-hour RTO, backup cadence, restore rehearsal, and rollback triggers.
- **Insufficient observability:** accepted. Added minimal service/route metrics, alerts, ownership, and runbook requirements.
- **Non-durable ingestion:** accepted. Added durable checkpointed delivery, idempotency, bounded retry, and safe replay.
- **Supply-chain gap:** accepted. Added locked dependencies, image pinning/scanning, and patch deadlines.
- **Irreproducible performance test:** accepted. Added workload mix, duration, dataset, cache modes, and separate simulation/ingestion limits.
- **Unsafe contract contraction:** accepted. Added consumer inventory, checksums, soak, and old-version rollback evidence.
- **Browser-side privacy gap:** accepted. Added storage, cookie, URL, console, cache, source-map, logout, back/forward-cache, and account-switching constraints.
- **User-state continuity gap:** accepted. Added mixed-version and rollback checks for URLs, sessions, forms/drafts, uploads, Career saves, and active matches.
- **Uncertain mutation UX:** accepted. Added checking state, input preservation, duplicate prevention, and status-based resolution.
- **Unmeasurable accessibility:** accepted. Added WCAG 2.2 AA criteria and changed-flow verification.
- **Undefined loading/error recovery:** accepted. Every data view now defines loading, empty, stale, timeout, auth, and partial-dependency states with a next action.
- **Missing browser performance budget:** accepted. Added p75 Core Web Vitals budgets on a representative mobile/network profile.
- **Unmeasured cognitive load:** accepted. Phase 0 captures labels, steps, hierarchy, and recovery behavior; refactors cannot worsen them silently.
- **Unrecorded user impact of behavior changes:** accepted. Decisions now include visible impact, state migration, recovery, and acceptance checks.

## Open Questions

The implementation plan must inventory exact file moves, removal candidates, build commands, migration risks, and verification checkpoints. Service-boundary evidence and baseline performance values are Phase 0 outputs; topology changes depending on them cannot begin earlier.
