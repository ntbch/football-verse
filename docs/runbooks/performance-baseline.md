# Performance Baseline Runbook

Date: 2026-07-22  
Raw result: `docs/architecture/performance-baseline-2026-07-22.json`

## Reproduce

From the repository root, with Docker running:

```powershell
./scripts/performance.ps1 \
  -DurationSeconds 900 \
  -Workers 16 \
  -OutputPath docs/architecture/performance-baseline-YYYY-MM-DD.json
```

The command builds an isolated Compose project, runs the global readiness smoke,
loads generated data from `scripts/performance_seed.sql`, executes the workload,
and removes the exact project and its volumes. It does not read development
databases or use real users, uploads, tokens, provider data, or content.

## Environment

| Item | Baseline |
|---|---|
| Host | Windows 11 IoT Enterprise LTSC `10.0.26100` |
| CPU | Intel Core i7-13620H, 10 cores / 16 logical processors |
| Memory | 15.7 GB host memory |
| Docker | Engine/client 29.6.1; Compose 5.1.4 |
| Topology | repository Compose images, one replica each |
| External football provider | disabled; deterministic empty/mock fallback |

No Docker CPU/memory limit was configured. Future comparisons must record any
different host, resource cap, image/runtime version, or provider mode.

## Dataset and Workload

The generated PostgreSQL dataset contains 10,000 users, 50,000 published news
articles, 10,000 forum threads with 100,000 posts, 1,000 fixtures, and 100,000
user predictions. Generated identities use `example.test`; password hashes are
non-login placeholders.

The 900-second run used 16 concurrent workers. The first 60 seconds are reported
as cold and the remaining 840 seconds as warm. The global counter produced the
exact observed mix:

- 70% public reads: paged news, paged forum, leaderboard, provider fixtures.
- 20% authenticated reads: current user, notifications, personal predictions.
- 10% writes: idempotent-by-observation article-like toggles distributed across
  worker-specific articles.

## Result

75,782 requests completed with 0% transport/5xx errors in every route group.
The aggregate sustained rate was approximately 84.2 requests/second.

| Route group | Cold p95 | Warm p95 | Responses over 1 MB | Budget result |
|---|---:|---:|---:|---|
| Auth: current user | 134.69 ms | 119.60 ms | 0 | pass |
| Auth: notifications | 134.14 ms | 121.39 ms | 0 | pass |
| Auth: predictions | 150.62 ms | 123.11 ms | 0 | pass |
| Public forum | 210.05 ms | 201.71 ms | 0 | pass |
| Public leaderboard | 332.88 ms | 494.84 ms | 15,156/15,156 | **size fail; latency near limit** |
| Public news | 597.08 ms | 452.76 ms | 0 | cold latency fail; warm pass |
| Public provider fallback | 172.42 ms | 197.46 ms | 0 | pass |
| Like write | 149.53 ms | 122.50 ms | 0 | pass |

The design budgets are p95 at most 500 ms for cached/public reads, p95 at most
1 second for ordinary writes, less than 1% 5xx, and at most 1 MB per JSON
response. The current system passes the warm latency, write, and error budgets.
It fails the response-size budget because `/predictions/leaderboard` materializes
and returns all 10,000 rows. Cold news p95 also exceeds the read target.

## Accepted Baseline Gaps

These findings are not silently fixed during characterization:

1. Add a paged/ranked leaderboard contract with an expand/migrate window; retain
   a way to show the current user's rank without returning all users.
2. Measure the news query plan/index/cache behavior before changing repository
   code; the warm result passes but cold p95 does not.
3. Keep this workload deterministic and provider-offline. Provider network
   latency needs a separate dependency benchmark and must not contaminate the
   application baseline.

