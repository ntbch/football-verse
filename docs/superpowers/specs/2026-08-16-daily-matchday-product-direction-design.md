# Football Verse Daily Matchday Product Direction

Date: 2026-08-16

Status: Approved design

Primary goals: build a product for real users and create a strong portfolio case study

## Context

Football Verse already spans five deployables and several user-facing product
areas: source-backed football news, matchday data, predictions, daily games,
community discussion, profiles, notifications, administration, and Premium.
The repository has broad backend coverage and operational documentation, but
the user experience is spread across many routes and frontend journey coverage
is comparatively thin.

The next development phase will not add another major product area or prepare a
production deployment. It will turn the existing capabilities into one coherent,
repeatable daily user loop and make that loop demonstrably reliable.

## Product Direction

Football Verse will be a daily football hub organized around matchday context.
News, predictions, daily games, and community are supporting stages of one
experience rather than four independent products.

The canonical loop is:

1. Discover a source-backed football story.
2. Move into the related matchday context.
3. Submit a prediction or complete a short daily game.
4. Join the discussion around the story, fixture, or result.
5. Return through a result, reply, score, or streak notification.

News is the primary acquisition surface. Predictions and daily games create
commitment and repeat visits. Community creates identity and discussion around
the same football context. Profiles preserve the user's history, streaks,
achievements, and contributions.

Premium remains present as an experimental capability, but real sales are out
of scope until the free daily loop demonstrates demand and the existing legal,
provider, monitoring, and sandbox gates are complete.

## Primary Experience

The home page becomes the Daily Football Hub and answers three questions:

1. What football stories matter today?
2. Which matches or activities can I participate in today?
3. What is the community discussing now?

The primary journey is:

`Daily Hub -> story -> related matchday -> prediction or game -> discussion -> result notification -> Daily Hub`

Each stage must provide a useful next action. A story can link to its related
fixture and discussion. A matchday can expose related stories, prediction state,
and discussion. A scored prediction or reply can bring the user back to the
relevant context instead of a generic destination.

No new top-level module is introduced in this phase. Admin, billing, and
infrastructure work is prioritized only when it directly enables or protects
the daily loop.

## Architecture and Ownership

The existing five deployables remain. No additional microservice or event bus is
introduced.

| Deployable | Responsibility in the daily loop |
|---|---|
| Web | Daily Hub, story, matchday, participation, discussion, profile, and state presentation |
| Gateway | Single public edge, routing, edge authentication checks, rate limiting, request identity, and realtime delivery |
| Core API | Canonical user, story, community, prediction record, daily game, notification, profile, and Premium state |
| Content Ingestion | Approved-source collection, normalization, durable delivery, and source provenance |
| Prediction | Provider-backed fixtures, standings, availability, and specialist calculations |

Core remains the durable owner of user-facing product state. Prediction does
not become an independent owner of user predictions. Content Ingestion delivers
normalized source material to Core but does not become the public read API.
The browser continues to communicate only through Gateway.

## Football Context

A shared Football Context links existing modules using canonical football
entities instead of frontend string matching. Context may identify a fixture,
competition, club, player, or topic. It is a product-level contract, not a new
service. Core owns persisted context references and their public API shape;
Prediction remains the authority for provider-backed fixture and competition
payloads that Core references.

The implementation design must reuse existing identifiers and associations where
they are already authoritative. Any new context reference must have:

- a stable type and identifier;
- one durable owner;
- explicit rules for missing or stale provider data;
- a migration and backward-compatible API contract when persisted;
- tests showing that related content is not joined only by display names.

This context enables story-to-matchday, matchday-to-story, contextual discussion,
targeted notifications, and cross-module profile history without duplicating
ownership.

## Data Flow

External football sources and the football provider are normalized at their
existing service boundaries. Core stores canonical user-facing state. Gateway
serves the browser and carries realtime notifications.

The main flow is:

`approved sources and provider -> normalize -> Core canonical state -> Gateway -> Daily Hub -> user action -> Core transaction/outbox -> Gateway realtime -> contextual return`

Existing database transactions, outbox mechanisms, and Gateway realtime are
used before introducing new distributed infrastructure. New asynchronous
infrastructure requires measured evidence that these mechanisms cannot meet a
defined reliability or latency target.

## Availability and Error Contract

Services and the Web use stable, non-secret reason codes for expected failure
states:

| Code | Meaning | Required Web behavior |
|---|---|---|
| `NO_DATA` | The source is reachable but has no applicable data | Explain the empty state and keep adjacent real content available |
| `PROVIDER_UNAVAILABLE` | An upstream dependency failed or timed out | Name the temporary outage, preserve usable sections, and allow bounded retry |
| `UNSUPPORTED` | The requested competition or capability is not supported | Explain the limitation without fabricating a fallback |
| `AUTH_REQUIRED` | The action requires authentication | Preserve intent and direct the user to authenticate |
| `FORBIDDEN` | The authenticated user lacks permission | Do not reveal protected resource details |
| `CONFLICT` | State changed or the action is no longer valid | Refresh authoritative state and explain the conflict |

An unavailable provider is never represented as successful mock data, a
synthetic statistic, or an ambiguous empty array. Partial responses retain real
sections and mark unavailable sections explicitly. Public errors expose a safe
reason code and correlation identifier; upstream bodies, secrets, tokens, stack
traces, payment payloads, and personal data remain out of responses and logs.

## Development Sequence

### Phase 0: Re-establish a clean baseline

- Define and enforce repository line-ending rules so CRLF/LF-only changes do not
  obscure reviewable work.
- Reconcile the active verification documentation with the retired Career and
  Match Engine deployables.
- Install the documented local development prerequisites and run the complete,
  isolated verification command.
- Record a current baseline only after every required suite either passes or has
  a named, reproducible blocker.
- Freeze unrelated feature additions until the baseline is clean.

### Phase 1: Complete one vertical slice

Deliver the full journey:

`Daily Hub -> story -> related matchday -> prediction -> discussion -> scored result`

Use source-backed or reproducibly seeded data. Cover guest and authenticated
states, mobile layout, loading, empty data, provider outage, authorization,
conflict, and retry behavior. The journey must not require an administrator to
repair data manually during normal operation.

### Phase 2: Build retention

- Connect the daily game and prediction streak to the Daily Hub.
- Deliver contextual notifications for match start, scored prediction, earned
  achievement, and discussion reply.
- Make profiles show prediction history, streaks, achievements, and community
  contributions.
- Add privacy-safe analytics for each transition in the daily loop.

### Phase 3: Prove reliability

- Add focused frontend unit tests for state and transformation logic.
- Add browser journeys for guest, registered user, and moderator behavior.
- Add contract and integration coverage at Gateway/Core/Prediction boundaries.
- Maintain a deterministic demo dataset and a repeatable local reset path.
- Verify accessibility, responsive behavior, provider failure states, and public
  route performance budgets.

Production deployment, production payment activation, and infrastructure
expansion are explicitly outside these phases.

## Verification Strategy

Every change to the daily loop requires the smallest applicable set of:

- unit tests for isolated rules and transformations;
- contract or integration tests at service and persistence boundaries;
- a browser test for a changed critical user journey;
- loading, empty, error, unauthenticated, unauthorized, conflict, and mobile
  state review;
- privacy review for logs, analytics, browser storage, and error payloads;
- performance-budget verification for affected public routes.

The repository-level verification command remains the release-quality gate. A
suite skipped because a dependency is missing is a blocker, not a pass. Tests
that bind loopback ports must run in an environment that permits local sockets;
sandbox restrictions are documented separately from product failures.

## Analytics and Success Criteria

The beta measures the daily loop rather than vanity totals:

- Daily Hub to story or matchday transition rate.
- Prediction submission or daily-game completion rate.
- Discussion participation after reading or playing.
- D1 and D7 return rate.
- Completion rate for the full vertical slice.
- Provider failure rate and the percentage of partial pages that remain useful.

For the first instrumented cohort of at least 20 consenting beta users observed
for 14 days, the initial validation targets are:

- at least 50% of activated users complete one full vertical-slice journey;
- at least 25% D1 return and 10% D7 return;
- fewer than 5% of daily-loop requests end in an unhandled provider failure;
- no critical security, privacy, or data-integrity incident.

These are product-learning thresholds, not production service-level objectives.
After the first cohort, targets are revised from recorded funnel evidence rather
than increased by assumption.

Analytics events must not contain access tokens, raw payment/provider payloads,
email addresses, or free-form community content.

The development phase is considered successful when:

- a new user can understand the product's value within one minute;
- the daily loop completes without fabricated data or routine admin repair;
- every primary step has a truthful loading, empty, error, and authorization
  state;
- the full verification baseline runs from documented commands and produces
  repeatable results;
- the beta funnel reveals where users stop and why;
- no unresolved critical security, privacy, or data-integrity defect affects the
  loop.

## Portfolio Deliverable

The same work becomes a concise case study containing:

- the user problem and the decision to unify modules around a daily matchday
  loop;
- the deployable and data-ownership diagram;
- the Football Context and availability-contract decisions;
- a two-to-three-minute deterministic demo;
- one documented startup command and one verification command;
- current test and performance evidence;
- explicit trade-offs, known limitations, and rejected complexity.

The case study demonstrates product judgment, frontend and backend integration,
reliability, security, and operational thinking. It does not present the number
of technologies or services as the primary achievement.

## Scope Guardrails

The following are out of scope until the daily loop is proven:

- additional top-level product modules;
- another microservice, message broker, or orchestration layer;
- production deployment and production payment activation;
- invented content, statistics, fixtures, form, or provider fallbacks;
- unrelated visual redesigns or broad refactors;
- integrations without a defined user-loop metric or operational owner.

When priorities conflict, real-user value wins first, portfolio clarity second,
and technology exploration third.
