# Microservice Architecture Plan

## Goal
Move Football Verse from Spring Boot monolith toward staged microservices for learning, selective scaling, football match prediction, live match data, and mini Football Manager gameplay.

## Recommended Approach
Use hybrid staged microservices first:

- Keep Spring Boot as core API for auth, users, news, forum, admin, moderator.
- Add Node.js service for realtime gateway, live updates, leaderboard streams, and API aggregation.
- Add Python service for match data ingestion, prediction scoring, and game simulation.
- Keep Next.js as main web app; add separate React app only when game UI grows beyond normal pages.
- Use Docker Compose + API Gateway first; add Kubernetes/minikube after services run locally.

Skipped full service split now. Add when core boundaries are stable and duplicated local ops pain is worth it.

## Reference: Digesty Sports
Digesty positions prediction as an AI football feature, but the visible product shell is simple: league page, match schedule, status tabs, standings, and prediction entry.

Borrow:

- League-first navigation, starting with Premier League.
- Match schedule as the main prediction entry point.
- Status tabs: upcoming, live, result.
- Separate standings and prediction routes.
- Login gate only when user submits prediction, not when browsing fixtures.

Do not copy:

- AI branding before the scoring model exists.
- Heavy realtime UI before live data and prediction leaderboard work.

## Reference: Prediction Sites

Borrow:

- League and season navigation before prediction details.
- Round/date grouping so users scan fixtures quickly.
- Prediction table columns: home team, away team, kickoff, probability, pick, correct score, average goals, odds, and result.
- Market tabs later: 1X2, over/under 2.5, both teams to score, double chance.
- Match detail page later: team form, head-to-head, standings position, injuries/news, trend notes.
- Prediction history: show actual score and whether the pick won/lost after final whistle.

Do not copy:

- Betting slip, stake controls, bookmaker CTA, or gambling-first copy.
- Too many markets before basic user prediction works.
- "AI" label until a model or transparent heuristic exists.

## Alternatives Considered
- Modular monolith: simpler, but does not teach service ops or multi-runtime boundaries enough.
- Full microservice split now: good learning surface, but too much boilerplate before prediction/game value exists.
- Game-first split: useful later, but current product still needs stable auth/news/forum base.

## Tasks
- [x] Write target service map in `docs/ARCHITECTURE.md` -> Verify: each service has owner domain, stack, database, and public routes.
- [x] Define API Gateway route table -> Verify: `/api/v1/*`, `/realtime/*`, `/matches/*`, `/game/*` have one upstream each.
- [x] Split databases inside PostgreSQL by service -> Verify: architecture plan lists `core_db`, `match_game_db`, optional Redis for realtime.
- [ ] Keep Spring Boot core service intact -> Verify: current auth/news/forum/admin/moderator APIs remain unchanged.
- [ ] Plan Node.js realtime service -> Verify: covers SSE/WebSocket for live score, prediction leaderboard, simulation events.
- [x] Plan Python match/game service -> Verify: covers third-party football API sync, prediction scoring, mini-manager simulation.
- [ ] Define cross-service auth -> Verify: JWT user identity passed through gateway; internal service calls documented.
- [ ] Define event flow -> Verify: match updates and game events publish once, realtime service fans out.
- [ ] Add local ops plan -> Verify: Docker Compose starts gateway, core, realtime, match-game, PostgreSQL, Redis/logs if used.
- [ ] Phase X: Verification -> Verify: smoke path documented from login to match list to user prediction to leaderboard update.

## Done When
- [ ] Architecture doc shows staged migration, not big-bang rewrite.
- [ ] Each stack has a clear reason: Spring Boot for core domain, Node.js for realtime, Python for data/simulation, Next.js for web.
- [ ] First implementation phase has 2-3 services max.
- [ ] No new runtime is added without a feature that needs it.

## Backend Phases

- [x] Phase 0: contracts and ownership in `docs/ARCHITECTURE.md`.
- [ ] Phase 1: Python Match/Game service for Premier League fixtures, standings, and prediction table. Spring user-pick APIs pending.
- [ ] Phase 2: Spring Boot prediction submission, scoring, and leaderboard.
- [ ] Phase 3: Node Realtime service for live score, leaderboard, and game streams.
- [ ] Phase 4: mini Football Manager simulation in Python Match/Game.
- [ ] Phase 5: move working Compose services to minikube.

## Decision Log
- Chose staged hybrid microservices because current app is a working monolith and user wants learning plus selective scaling.
- Chose Spring Boot core because auth/user/news/forum already exist there.
- Chose Node.js for realtime because WebSocket/SSE fanout and API aggregation fit its strengths.
- Chose Python for match API ingestion, prediction scoring, and simulation because future ML/game logic fits Python better.
- Chose one PostgreSQL instance with separate databases because local learning stays simple while service ownership is visible.
- Chose Docker Compose first, Kubernetes/minikube later because ops should not block feature slicing.

## Open Questions
- Pick football API provider: football-data, API-Football, Sportmonks, or another.
- Decide first extracted service: Node realtime or Python match-game.
- Decide whether game UI stays inside Next.js first or becomes separate React app later.
