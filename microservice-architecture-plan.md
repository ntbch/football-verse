# Microservice Architecture Plan

## Goal
Move Football Verse from Spring Boot monolith toward staged microservices for learning, selective scaling, football match prediction, live match data, and mini Football Manager gameplay.

## Language & Service Matrix (Separation of Strengths)

To leverage the best capabilities of each technology stack:

### 1. Java (core-service) - Core business domain & Transact-heavy DB CRUD
* **Strengths:** Thread safety, strict type system, transactional consistency (ACID), enterprise-grade security.
* **Responsibilities:**
  * **User Core:** Authentication, User Profiles, JWT issuing, role/permission management.
  * **Social/CMS Core:** News CMS storage, Forum categories/threads/replies, nested comments, Likes & Bookmarks databases.
  * **Audit & Moderation:** Report handling and admin logs.

### 2. Node.js (gateway-service) - High-concurrency I/O, API Gateway & Realtime
* **Strengths:** Non-blocking I/O event loop, massive concurrent socket connections, rich browser automation and scraping ecosystem.
* **Responsibilities:**
  * **API Gateway & Routing:** Single ingress point routing traffic downstream.
  * **Realtime & Notifications:** Socket.io WebSocket server to push realtime notifications (mentions, likes) and live scores, subscribing to Redis Pub/Sub.
  * **Scraper & Crawler:** Periodic RSS, Sitemap, and Homepage HTML scraping with anti-bot bypass (`fingerprint-suite` + `cheerio`).

### 3. Python (prediction-service & simulator-service) - Data Sync & Game Simulation
* **Strengths:** Excellent for data manipulation, mathematical models, rapid algorithmic script execution.
* **Responsibilities:**
  * **prediction-service:** Fetching external football data APIs, syncing fixtures/standings, and calculating prediction scoring.
  * **simulator-service (Phase 4):** Running tactical game simulations and generating chronological match event timelines for mini Football Manager.

## Recommended Approach
Use hybrid staged microservices first:

- Keep `core-service` as core API for auth, users, news, forum, admin, moderator.
- Add `gateway-service` for realtime gateway, live updates, crawler, and API aggregation.
- Add `prediction-service` for match data ingestion and prediction scoring.
- Add `simulator-service` later for virtual game simulation.
- Keep `web-client` as main Next.js web app.
- Use Docker Compose + API Gateway first; add Kubernetes/minikube after services run locally.

Skipped full service split now. Add when core boundaries are stable and duplicated local ops pain is worth it.




## Alternatives Considered
- Modular monolith: simpler, but does not teach service ops or multi-runtime boundaries enough.
- Full microservice split now: good learning surface, but too much boilerplate before prediction/game value exists.
- Game-first split: useful later, but current product still needs stable auth/news/forum base.

## Tasks
- [x] Write target service map in `docs/ARCHITECTURE.md` -> Verify: each service has owner domain, stack, database, and public routes.
- [x] Define API Gateway route table -> Verify: `/api/v1/*`, `/realtime/*`, `/matches/*`, `/game/*` have one upstream each.
- [x] Split databases inside PostgreSQL by service -> Verify: architecture plan lists `core_db`, `match_game_db`, optional Redis for realtime.
- [ ] Keep `core-service` intact -> Verify: current auth/news/forum/admin/moderator APIs remain unchanged.
- [ ] Plan `gateway-service` realtime & notifications -> Verify: covers WebSocket for live score, prediction leaderboard, simulation events, and user notifications (likes/mentions) via Redis Pub/Sub.
- [ ] Plan `gateway-service` crawler -> Verify: RSS/scraping with fingerprint-suite, pushes raw/clean articles to `core-service` API.
- [x] Plan `prediction-service` -> Verify: covers third-party football API sync, prediction scoring.
- [ ] Define cross-service auth -> Verify: JWT user identity passed through gateway; internal service calls documented.
- [ ] Define event flow -> Verify: match updates, game events, and user notifications publish once, realtime service fans out.
- [ ] Add local ops plan -> Verify: Docker Compose starts gateway, core, realtime, match-game, PostgreSQL, Redis/logs if used.
- [ ] Phase X: Verification -> Verify: smoke path documented from login to match list to user prediction to leaderboard update.

## Done When
- [ ] Architecture doc shows staged migration, not big-bang rewrite.
- [ ] Each stack has a clear reason: `core-service` for core domain, `gateway-service` for realtime/crawler, `prediction-service` for prediction scoring, `web-client` for frontend.
- [ ] First implementation phase has 2-3 services max.
- [ ] No new runtime is added without a feature that needs it.

## Backend Phases

- [x] Phase 0: contracts and ownership in `docs/ARCHITECTURE.md`.
- [ ] Phase 1: `prediction-service` for Premier League fixtures, standings, and prediction table. Spring user-pick APIs pending.
- [ ] Phase 2: `core-service` prediction submission, scoring, and leaderboard.
- [ ] Phase 3: `gateway-service` Realtime & Notification and Crawler services.
- [ ] Phase 4: mini Football Manager simulation in `simulator-service`.
- [ ] Phase 5: move working Compose services to minikube.

## Decision Log
- Chose staged hybrid microservices because current app is a working monolith and user wants learning plus selective scaling.
- Chose `core-service` because auth/user/news/forum already exist there.
- Chose `gateway-service` for realtime/notification because WebSocket connection density, event loop concurrency, and API aggregation fit its strengths.
- Chose `gateway-service` crawler because JavaScript scraping ecosystem (cheerio, fingerprint-suite) is superior for bypassing anti-bot measures than Java.
- Chose `prediction-service` and `simulator-service` because data manipulation, prediction scoring, and future simulation fit Python better.
- Chose one PostgreSQL instance with separate databases because local learning stays simple while service ownership is visible.
- Chose Docker Compose first, Kubernetes/minikube later because ops should not block feature slicing.

## Open Questions
- Pick football API provider: football-data, API-Football, Sportmonks, or another.
- Decide first extracted service: Node gateway-service or Python prediction-service.
- Decide whether game UI stays inside `web-client` first or becomes separate React app later.
