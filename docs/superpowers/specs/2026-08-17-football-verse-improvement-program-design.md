# Football Verse Improvement Program Design

**Date:** 2026-08-17  
**Status:** Approved  
**Implementation strategy:** Product-loop-first vertical slices

## 1. Purpose

Football Verse will become a portfolio-ready daily football hub with a
production-ready foundation. The product must demonstrate one memorable,
coherent journey instead of a collection of loosely connected modules:

```text
Daily Hub
  -> read source-backed football news
  -> inspect the related matchday context
  -> submit a prediction
  -> join the related discussion
  -> return when the context changes
```

The public demo and the local Docker Compose environment must use real football
data. Runtime code must never fabricate articles, fixtures, standings, scores,
players, or provider success states.

## 2. Product Decisions

- The near-term outcome is a strong portfolio and public demo, not a paid launch.
- The technical foundation must remain suitable for a future production launch.
- The product identity is “a daily football hub”: news, matchday, predictions,
  and discussion are one loop.
- The implementation may remove, merge, or demote weak features that do not
  support that loop.
- The established Football Verse visual identity remains intact.
- The final public experience is bilingual Vietnamese and English.
- The first provider tier uses real free or public sources. Provider adapters
  must allow a later paid provider without changing Web or Core contracts.
- The result must be usable from a public URL and reproducible locally.

## 3. Non-Goals

- Reintroducing Career or Match Engine deployables.
- Adding new microservices, brokers, or databases without measured need.
- Supporting many competitions before Premier League quality is reliable.
- Rebranding Football Verse or replacing its design system.
- Shipping synthetic runtime data to make the demo appear populated.
- Enabling billing before the existing legal, sandbox, webhook, and operational
  release gates pass.

## 4. Design Invariants

The current editorial-sports design is a product constraint, not a starting
point for a redesign. Improvements may refine layout, hierarchy, accessibility,
responsive behavior, and component boundaries while preserving:

- the warm ivory body and surface palette;
- the terracotta accent;
- Georgia-style serif display typography and system sans-serif body typography;
- editorial story imagery, rounded panels, and restrained shadows;
- the current light and dark themes;
- the Football Verse name, navigation character, and magazine-like public shell;
- the separate public, admin, and moderator presentation contexts.

The canonical visual tokens remain in `apps/web/src/styles/tokens.css`.
Duplicated or one-off styles should migrate toward those tokens rather than
introducing a parallel system.

## 5. System Architecture

The five active deployables remain:

### Web

Owns browser routing, localized presentation, query state, loading/error/empty
states, accessibility, and the connected daily journey. It owns no durable
football records.

### Gateway

Remains the only public API edge. It owns routing, edge JWT validation,
rate-limit enforcement, realtime fan-out, public liveness, dependency-aware
readiness, and protected metrics.

### Core API

Owns accounts, news, forum, notifications, user predictions, moderation,
billing state, and the product-facing football-context read model. Core stores
the provider provenance needed for product queries; it does not become a
third-party provider client.

### Prediction Service

Owns free-tier football-provider access, provider-specific normalization,
league policy, and provider availability semantics. Its stable normalized
contract allows a future paid-provider adapter.

### Content Ingestion

Owns source schedules, approved RSS/API adapters, checkpoints, secure retrieval,
normalization, durable spool delivery, retries, and operational ingestion state.
Core remains the owner of imported RawItem, Story, Evidence, and interaction
records.

`FootballContext` is the common relationship layer for a fixture, story, news
article, and forum thread. Services continue to communicate through contracts;
no deployable writes another deployable's database.

## 6. Real-Data Contracts

### News flow

```text
Approved RSS or free API
  -> secure fetch and schema validation
  -> normalization and stable identity
  -> durable spool
  -> Core RawItem
  -> Story and Evidence aggregation
  -> FootballContext assignment
  -> Gateway
  -> Web
```

Every imported record preserves source identity, original URL, publication
time, collection time, and revision identity. Replaying delivery is safe and
must not create duplicate product records.

### Fixture flow

```text
Free football provider
  -> Prediction adapter
  -> normalized fixture response
  -> Core product read model with provenance and synchronization time
  -> Matchday, prediction, contextual news, and forum queries
```

Provider-derived product records include `source`, `providerId`, `fetchedAt`,
and `updatedAt`. The provider remains authoritative; Core stores a queryable,
source-attributed projection for the daily product loop.

### Freshness policy

- Persisted source-backed news remains available with its original timestamps.
- Scheduled fixture data may use the last successful real synchronization and
  must show its update time when outside the normal refresh window.
- A delayed live result must never continue to appear as confidently live.
  It changes to a delayed/unavailable state once its live freshness threshold
  expires.
- When no successful real response exists, the product shows an unavailable or
  empty state. It does not generate a fallback record.
- Provider-specific backoff and circuit state must not suppress unrelated
  providers.

## 7. Public Experience

### Daily Hub

Home becomes an intentional daily hub, using existing editorial components:

1. A source-backed leading story.
2. Matchday Pulse for upcoming or live Premier League fixtures.
3. Stories and discussions sharing the same FootballContext.
4. A clear path to submit or inspect a prediction.
5. A personalized feed for followed clubs, players, and competitions.
6. Daily Games as secondary return content below the core journey.

### Connected pages

- News Detail exposes source evidence, related fixture context, and related
  discussion.
- Matchday owns the canonical fixture detail experience: provider freshness,
  contextual stories, prediction, and discussion.
- `/predictions/[fixtureId]` becomes a compatibility redirect to the canonical
  Matchday route after equivalent behavior is verified.
- Forum threads retain community structure and add explicit navigation back to
  their related fixture or story.
- Games remain available but do not compete with Matchday in the primary
  navigation hierarchy.
- Admin and Moderator keep their role-specific shells.

### Component boundaries

Large pages are decomposed into focused units for headline content, matchday
context, prediction interaction, related discussion, provenance/freshness, and
page states. Shared shells may be consolidated internally only when their
public rendering remains consistent with the existing design.

## 8. Localization

The final canonical route families use `/vi/...` and `/en/...`. A language
switch preserves the current resource and user intent. Legacy unprefixed links
redirect safely to a configured default locale without redirect loops.

- Interface strings live in typed locale catalogs.
- Source content remains in its original language and is labeled accordingly.
- The system does not silently machine-translate source articles.
- Metadata, canonical URLs, `hreflang`, sitemap entries, dates, times, numbers,
  and accessibility labels follow the selected locale.
- A rendered public shell must not mix Vietnamese and English interface copy.

Localization is delivered incrementally: Phase 1 creates locale-safe component
and routing seams for the daily loop; Phase 3 completes both catalogs and every
retained public route.

## 9. Error and Recovery Design

Public contracts use stable error categories:

- `validation`
- `authentication`
- `authorization`
- `conflict`
- `rate_limit`
- `provider_unavailable`
- `stale_data`
- `internal`

Error responses include a stable application code and correlation ID but never
an internal stack trace, token, provider credential, or private user detail.
Web maps each category to an appropriate action: correct input, sign in, reload
authoritative state, retry later, or continue with clearly labeled last-known
real data.

Provider calls use bounded timeouts, retry only retryable failures, honor
`Retry-After`, apply exponential backoff with jitter, and use provider-scoped
circuit breakers. Imports, payment webhooks, and state-sensitive prediction or
game mutations retain idempotency or optimistic-version protection.

## 10. Security and Operations

- Gateway remains the sole public application edge.
- Refresh tokens remain hashed at rest and rotated through HttpOnly cookies.
- Internal routes require the internal token; protected metrics do not become
  public diagnostics.
- Production rate limiting requires Redis and correct proxy-depth configuration.
- Upload, rich-text, ingestion URL, redirect, and provider response validation
  remain centralized and covered by tests.
- CSP enforcement follows reviewed report-only evidence.
- Structured logs and metrics exclude tokens, raw credentials, private records,
  and sensitive request bodies.
- Operators can see provider health, last successful synchronization, item
  counts, failure counts, spool depth, and delivery latency.
- Public and local deployments use the same image and configuration contract.
- Docker Compose remains the reproducible local entry point.
- Secrets enter only through the deployment environment.
- Database and upload restore procedures remain release gates.

Public readers can traverse the core journey without authentication. Mutations
such as prediction submission and posting require a real registered account.
The product does not ship a privileged or fake demo account.

## 11. Verification Strategy

### Per-deployable gates

- Web: lint, typecheck, production build, unit/behavior tests, browser smoke,
  accessibility checks, localization parity, and performance budgets.
- Core: unit, repository, contract, and isolated database integration tests.
- Gateway: routing, edge-auth, rate-limit, security-header, readiness, and
  resilience tests.
- Content Ingestion: adapter contracts, URL and response safety, identity,
  idempotency, backoff, spool durability, and recovery tests.
- Prediction: provider normalization, league policy, timeout/error mapping, and
  provider-unavailable behavior.
- Repository: Compose validation and an end-to-end daily-loop smoke test.

Automated tests may use isolated generated identities and test-only fixtures or
sanitized recordings of real provider payloads. These records never enter the
development or public-demo databases and are not runtime fallback data.

### Program acceptance criteria

- A clean checkout follows one documented local startup and verification path.
- The retained daily journey works in Vietnamese and English.
- Runtime football content always exposes real-source provenance and freshness.
- A provider failure produces a truthful degraded state rather than fabricated
  success or a whole-page crash.
- Locale, compatibility, and canonical redirects have automated coverage.
- The core journey meets WCAG 2.2 AA for the audited pages and interactions.
- Performance budgets are recorded as enforceable repository checks.
- The full verification matrix is green before completing a program phase.
- The public demo and local environment use compatible service contracts.

## 12. Delivery Phases

Each phase receives its own implementation plan, verification evidence, and
review. Work does not proceed as one repository-wide rewrite.

### Phase 1: Daily Hub vertical slice

This is the first implementation project. It includes:

- run and record the current verification baseline;
- make Matchday the canonical fixture-detail experience;
- connect Home, News Detail, Matchday, Prediction, and Forum through the
  existing FootballContext contract;
- remove or redirect duplicate fixture-detail paths after parity tests pass;
- expose basic source provenance and freshness in the connected journey;
- decompose only the oversized pages touched by this vertical slice;
- establish locale-safe route/component seams without claiming full bilingual
  completion;
- retain the approved Football Verse visual identity;
- add an end-to-end daily-loop browser test.

Phase 1 does not overhaul every admin page, add competitions, replace providers,
or complete all localization catalogs.

### Phase 2: Real-data reliability

Harden provider adapters, persisted product projections, freshness rules,
backoff, circuit breakers, provenance, ingestion recovery, and operational
source health.

### Phase 3: Bilingual completeness

Complete `/vi` and `/en` public routes, typed catalogs, language switching,
locale-aware formatting, metadata, sitemap, `hreflang`, redirects, and
translation-parity tests.

### Phase 4: Quality hardening

Complete the retained-product accessibility audit, performance-budget work,
security controls, observability, CI gates, public deployment contract, and
restore/rollback evidence.

### Phase 5: Product pruning

Audit retained features against the daily-hub identity. Merge duplicate shells
and routes, simplify low-value administration surfaces, remove dead code, and
update architecture and product documentation to the final supported scope.

## 13. Risks and Mitigations

### Free-provider instability

Use stable normalized adapters, provider-scoped recovery, clear freshness, and
truthful unavailability. Do not solve instability with fabricated data.

### Scope expansion

Treat each phase as an independent approved project. Premier League and the
daily loop remain the boundary until their acceptance criteria pass.

### Visual drift

Review touched pages against the existing token and shell contracts. Refactors
must reuse the established visual primitives.

### Breaking legacy links

Add compatibility redirects only after route-parity and redirect-loop tests.

### Nondeterministic live-provider tests

Keep deterministic contract tests separate from non-gating live-provider smoke
checks. Recorded payloads validate parsers; the live smoke validates current
reachability and reports freshness without deciding the entire release alone.

## 14. Next Step

The next artifact is an implementation plan for **Phase 1: Daily Hub vertical
slice only**. Later phases require their own design confirmation if the approved
program assumptions change.
