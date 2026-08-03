---
title: Core API Performance Optimization Implementation Plan
plan_version: 1.0
status: COMPLETE
last_updated: 2026-08-03
scope:
  - services/core-api/news
  - services/core-api/search
  - services/core-api/config
  - PostgreSQL read-path indexes
success_criteria:
  - news list/detail keep the existing response contract
  - search avoids per-result count queries
  - Gemini never blocks raw-item import
  - Redis-backed cache is optional by configuration and safe in tests
  - migrations apply cleanly on the current Docker database
---

# Core API performance optimization

## Decisions

1. Keep PostgreSQL as the source of truth; do not add a broker or a new data store.
2. Use Redis only for small, stable reference lists (`newsCategories`, `newsSources`), with a one-minute TTL and explicit invalidation.
3. Batch interaction/count queries for search results instead of issuing one query per result.
4. Keep the news response contract unchanged and add database indexes for the published/category/provider read paths.
5. Import raw news synchronously with a deterministic fallback summary and exactly three fallback key points. Queue Gemini enrichment in a durable PostgreSQL outbox.
6. Gemini is responsible only for `summary` and exactly three `keyPoints`; category remains local (`NewsCategoryClassifierService`).

## Implementation map

| Area | Change | Verification |
|---|---|---|
| Cache | Redis cache manager; cache categories/sources; invalidate on writes | Core starts with Redis; test profile uses simple cache |
| Search | Batch article/thread likes, bookmarks, post counts and like counts | `SearchIntegrationTest` |
| News reads | V61 partial/indexed read paths | Docker Flyway reaches V61 |
| AI | V62 outbox, leasing, retry/backoff, stale-basis protection | `RawItemImportIntegrationTest`; compile |
| Fallback | Import does not call Gemini; fallback remains immediately available | `RawItemImportIntegrationTest` |

## Runtime contract

```text
raw item -> normalize/deduplicate -> persist story + fallback -> enqueue outbox
outbox worker -> Gemini summary + exactly 3 key points -> update only matching summary_basis_hash
category -> local classifier (never Gemini)
```

The outbox uses `PENDING`/`PROCESSING`/`COMPLETED`/`FAILED`, a ten-minute lease, five attempts maximum, and exponential retry delay. A changed story revision cannot be overwritten by an older AI result.

## Acceptance checks

- [x] Core compiles after the optimization changes.
- [x] News/search/import targeted tests pass.
- [x] Docker Core starts with Redis and applies V61–V62.
- [x] Run the final performance smoke/benchmark and record the resulting p95/error rate below.

## Execution log

| Time | Check | Result |
|---|---|---|
| 2026-08-03 | `mvn -DskipTests compile` | PASS |
| 2026-08-03 | `RawItemImportIntegrationTest` (7 tests) | PASS |
| 2026-08-03 | Docker Flyway | PASS, database at V62 |
| 2026-08-03 | 60-second Docker benchmark, 16 workers, 5,898 requests | PASS, 0% errors; warm public-news p95 276.45 ms; warm trending p95 445.63 ms; warm leaderboard p95 157.32 ms; responses over 1 MB: 0 |

## Upgrade gate

The optimization gate is closed: the benchmark is recorded in `docs/architecture/performance-baseline-optimized.json`. Do not add further infrastructure or change the public news contract without a new measured bottleneck.
