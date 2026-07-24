# Service Contracts Baseline

Date: 2026-07-22  
Scope: observed contracts before repository and service refactoring. This is a
characterization document, not a promise that disputed behavior is correct.

## Edge Routing

| Public prefix | Gateway owner | Destination | Authentication | Identity forwarded |
|---|---|---|---|---|
| `/api/v1/game/**` | Gateway | Career `http://game-service:8081/game/**` | Bearer checked by Gateway and Career; Gateway service credential required | bearer retained plus `X-Internal-Token`; Career derives user from JWT |
| `/api/v1/**` | Gateway | Core API `http://core-service:8080/api/v1/**` | Core API security chain | Original bearer token |
| `/game/**` | Gateway | Career `http://game-service:8081/game/**` | Bearer checked by Gateway and Career; Gateway service credential required | bearer retained plus `X-Internal-Token`; Career derives user from JWT |
| `/matches/**` | Gateway | Prediction `http://prediction-service:8090/matches/**` | Public | none |
| `/standings/**` | Gateway | Prediction `http://prediction-service:8090/standings/**` | Public | none |
| Socket connection | Gateway | Gateway/Redis realtime | JWT supplied by client | JWT `uid`, `sub`, and optional roles |

The web currently uses `/api/v1/**` for Core and constructs `/game/**` by
removing `/api/v1` from its configured base URL. Both Career prefixes therefore
remain observed compatibility routes until consumers are migrated.

## Ownership and Internal Calls

| Capability | Owning deployable | System of record | Direct consumers | Internal dependencies |
|---|---|---|---|---|
| Accounts, roles, refresh tokens | Core API | Core PostgreSQL | Web, Gateway | Google token verification for Google login |
| News, comments, uploads | Core API | Core PostgreSQL plus upload directory | Web, crawler | Redis and crawler import requests |
| Forum and moderation | Core API | Core PostgreSQL | Web | notifications in Core |
| User prediction picks and scores | Core API | Core PostgreSQL | Web | Prediction provider API |
| Provider fixtures, standings, calculations | Prediction | upstream provider/cache | Core, Gateway, Web | external football provider; Redis through deployment |
| Career saves, squads, tactics, transfers, matches | Career | Career PostgreSQL | Web through Gateway | Match Engine |
| Match simulation/session transition | Match Engine | request/session payload only | Career | none |
| Edge proxy, realtime fan-out | Gateway | no durable records; Redis transient data | Web | Core, Prediction, Career, Redis |
| Metadata ingestion | Content Ingestion | Core owns RawItems/Stories; Ingestion owns spool/checkpoints | operator/scheduler | approved RSS/APIs and Core internal API |

No deployable may write another deployable's database. Uploaded files belong to
Core even though their metadata is in PostgreSQL and bytes are in a filesystem
directory.

## Public Route Families

| Route family | Owner | Read/write shape | Current access | Primary consumer |
|---|---|---|---|---|
| `/auth/{register,login,google,refresh,logout,me}` | Core | account/session commands and current-user query | mixed public/bearer | Web |
| `/news/**` | Core | article/category/tag queries; comment/like/bookmark commands | public reads, bearer writes | Web |
| `/forum/**` | Core | category/thread queries; create/reply/follow/report/like commands | public reads, bearer writes | Web |
| `/predictions/**`, `/matches/centre` | Core | fixtures, user picks, score/stat/leaderboard queries | mixed public/bearer | Web |
| `/users/me/**` | Core | profile and personal collections | bearer | Web |
| `/notifications/**` | Core | personal list/read commands | bearer | Web/navbar |
| `/search` | Core | cross-content query | public | Web |
| `/admin/**` | Core | users, news, fixtures, forum moderation, dashboards | admin role | Web/admin |
| `/moderator/**` | Core | reports, forum moderation, dashboard | moderator/admin role | Web/moderator |
| `/uploads` and `/uploads/{filename}` | Core | multipart create and asset read | admin create; observed public read | Web/admin and article readers |
| `/game/saves/**` | Career | save lifecycle and all Career subresources | trusted Gateway identity | Web/Career |
| `/health`, `/game/status` | Career | liveness/status | public by filter only for `/health`; status requires Gateway | deployment/operator |
| Prediction `/health`, `/leagues`, `/matches/**`, `/predictions/**`, `/standings/**` | Prediction | provider and calculation queries | public | Core/Gateway |
| Match Engine `/health`, `/simulate`, `/session/**` | Match Engine | deterministic simulation commands | internal network | Career |

All normal Core responses use `ApiResponse<T>` with `success`, optional
`message`, and `data`. Career and Python services do not consistently share that
envelope; consumers must not assume one global shape before contract unification.

## Mutable Command Boundaries

| Command group | Idempotency/unknown-outcome risk | Recovery expectation |
|---|---|---|
| Register/login/refresh/logout | refresh rotates server state; retry outcome can be unclear | client may retry login; refresh/logout need characterized retry semantics |
| Likes, bookmarks, follows, notification read | toggle-style endpoints may double-apply after timeout | refactor to desired-state or idempotency keys before changing transport |
| Create/update/delete news/forum content | duplicate create and lost update possible | surface request ID; operator restores from DB backup/audit data |
| Prediction submit/score/rescore | scoring is user-visible and may be repeated | transaction plus deterministic rescore; retain score log |
| Career advance day/season | high fan-out world mutation | one transaction per accepted command; resume from unchanged save after rollback |
| Transfer offer/terms/complete | multi-step financial mutation | server state is authoritative; repeat must not double-transfer |
| Match session continue/command/finish | retries can advance simulation twice | session revision/command identity required before transport redesign |
| Upload create/delete | DB/file partial failure possible | checksum inventory and orphan reconciliation required |
| Crawl/import | retries can duplicate content | durable ingestion state and source identity required before extraction |

## Critical Journey Baseline

| Journey | Owner(s) | Current acceptance check | State continuity | Recovery expectation |
|---|---|---|---|---|
| Login, reload, logout | Core, Gateway, Web | Core login integration tests; focused privacy test; browser smoke | access token is memory-only; reload rotates an HttpOnly refresh cookie | login can be repeated; logout revokes refresh state, clears the cookie, and clears client caches |
| Read news and comment | Core, Web | Core news tests and web build | article is public; comment requires bearer identity | failed comment stays unapplied and UI reports mutation failure |
| Create thread and reply | Core, Web | Core forum tests and web build | public read, authenticated mutation | reload authoritative thread after ambiguous failure |
| Submit and score prediction | Core, Prediction, Web | Core prediction tests plus Prediction contract tests | user pick in Core PostgreSQL | deterministic rescore and score log |
| Create Career and edit tactics | Career, Web | Career tests and focused web navigation tests | save/tactics in Career PostgreSQL | transaction rollback leaves prior save usable |
| Scout, negotiate, complete transfer | Career, Web | Career transfer integration tests | offer state in Career PostgreSQL | reload offer/save; completion must be single-application |
| Resume and finish interactive match | Career, Match Engine, Web | Career session tests, Match Engine tests, web playback tests | persisted Career session plus deterministic engine state | resume active session; finish commits match once |

## Browser and Privacy Contract

- The browser stores no bearer credential in `localStorage` or
  `sessionStorage`. The access token exists only in the in-memory auth store.
- Core sets and rotates the refresh token as an HttpOnly, path-scoped,
  SameSite cookie. Production configuration requires `Secure`; the legacy
  refresh-token body remains temporarily available for old clients.
- Axios sends credentials only to the configured Gateway origin. Gateway
  applies `private, no-store` to auth and bearer-authenticated responses.
- Logout revokes refresh state, clears the cookie and in-memory auth, and clears
  TanStack Query. A persisted back/forward-cache restore clears queries and
  rehydrates from the cookie before private state can be reused.
- Career URLs include `saveId`, `matchId`, and `sessionId`. These are identifiers,
  not authorization; every server lookup must remain scoped to the authenticated
  owner.
- Representative fixtures and docs must use generated IDs and `example.test`
  addresses. Never copy real tokens, upload contents, emails, user IDs, or DB
  rows into tests, logs, screenshots, or documentation.

## Known Contract Disputes

These are decision candidates. Refactoring must not silently choose behavior.

1. Web calls `DELETE /notifications/{id}`, but the observed Core notification
   controller exposes list/read/read-all only.
2. Web calls `/users/me/bookmarked-articles`, but the observed user controller
   exposes profile and followed threads only.
3. Career supports both `/api/v1/game/**` and `/game/**`; only the latter is
   generated by the current web helper.
4. The legacy Career trusted-header path remains available only through an
   explicit private-network compatibility flag; it must be removed after a
   measured zero-use soak period.
5. `GET /uploads/{filename}` needs an explicit public/private asset policy and
   retention contract.
6. Match/session commands have important retry semantics but no documented
   client idempotency key or optimistic revision contract.
7. Refresh tokens remain present in auth response bodies only for the measured
   old-client compatibility window; new browser code discards that field.
