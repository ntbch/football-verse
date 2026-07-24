# API

> This file is the endpoint reference. The canonical edge-routing and ownership
> inventory is [service contracts](architecture/service-contracts.md); security
> and identity behavior is defined by [identity contract](architecture/identity-contract.md).

All backend routes are versioned under:

```text
/api/v1
```

Admin routes use:

```text
/api/v1/admin
```

## Auth

- `POST /auth/register` creates a user and returns access and refresh tokens.
- `POST /auth/login` returns access and refresh tokens.
- `POST /auth/refresh` rotates a valid refresh token and returns a new token pair.
- `POST /auth/logout` revokes the submitted refresh token.
- `GET /auth/me` returns the current authenticated user.

Auth and validation errors use the shared error envelope:

```json
{ "success": false, "message": "Validation failed", "errors": [] }
```

## Admin news

- `GET /admin/news` lists non-deleted draft, published, and archived articles.
- `POST /admin/news` creates an article.
- `GET /admin/news/{id}` returns an admin article detail.
- `PUT /admin/news/{id}` updates an article.
- `PATCH /admin/news/{id}/status` publishes, archives, or drafts an article.
- `DELETE /admin/news/{id}` soft-deletes an article.
- `GET|POST /admin/news/categories` lists and creates news categories.
- `GET|POST /admin/news/sources` lists and creates approved metadata connectors.
- `PATCH /admin/news/sources/{id}/toggle` toggles RSS source activity.
- `PATCH /admin/news/sources/{id}/auto-publish` explicitly allows or stops
  automatic Story publication for one active source; it is off by default.
- `DELETE /admin/news/sources/{id}` deletes an unused connector or disables one
  whose evidence must be retained.
- `POST /admin/news/crawl` requests a background metadata synchronization.

Internal ingestion uses `POST /internal/news/raw-items` with the service
credential and versioned `NormalizedItem v1` payload. Legacy full-article import
remains temporary rollback compatibility only.

The ingestion worker exposes service-only controls on its internal port:
`GET /health`, authenticated `POST /crawl`, and authenticated `GET /readiness`.
The readiness response contains only per-source counters and sanitized failure
codes from the latest synchronization; it does not return source article data.

`GET /news/{slug}` expands aggregated Stories with `sources`. Each source
contains its publisher name, original URL, publication time, and primary flag.
For an aggregated Story, the detail response also includes `keyPoints`. Every
key point has one or more evidence entries containing the cited source name,
original URL, publication time, and a `SUPPORT` or `CONTRADICTION` relation.
List and search responses omit key-point evidence.
List and search responses use `sourceCount` without expanding this list.

## News interactions

Public like, bookmark, and comment endpoints only accept published news articles. Draft, archived, or deleted articles return `404 Article not found`; nested comments whose parent belongs to another article return `400 Parent comment must belong to the same article`.

- `GET /news` lists published articles.
- `GET /news/{slug}` returns one published article.
- `GET /news/{slug}/comments` lists comments for a published article.
- `POST /news/{id}/like` toggles the current user's like.
- `POST /news/{id}/bookmark` toggles the current user's bookmark.
- `POST /news/{id}/comments` creates a comment.

## Forum and moderation

- `GET /forum/categories` lists forum categories.
- `GET /forum/categories/{slug}/threads` lists visible threads.
- `POST /forum/categories/{slug}/threads` creates a thread and opening post.
- `GET /forum/threads/{slug}` returns a visible thread with visible posts.
- `POST /forum/threads/{id}/replies` creates a reply unless the thread is locked.
- `POST /forum/reports` creates a report after validating the target thread or post exists.
- `GET /admin/forum/reports` lists open reports.
- `PATCH /admin/forum/reports/{id}/resolve` resolves a report and notifies the reporter.
- `PATCH /admin/forum/threads/{id}/hide?value=true|false` hides or restores a thread.
- `PATCH /admin/forum/posts/{id}/hide?value=true|false` hides or restores a post.

## Notifications

- `GET /notifications` lists notifications for the current user.
- `PATCH /notifications/{id}/read` marks one current-user notification read.
- `PATCH /notifications/read-all` marks all current-user notifications read.

## Career game

Career routes use the gateway prefix `/game` and require the normal bearer token.

- `POST /game/saves` creates a Career with 8 fictional clubs, squads, and a 56-fixture double round-robin season.
- `GET /game/saves` and `GET /game/saves/{saveId}` return owned saves, current-season fixtures, season summary, and history.
- `PATCH /game/saves/{saveId}` renames an owned Career save.
- `DELETE /game/saves/{saveId}` deletes an owned Career save and cascades its game data.
- `GET /game/saves/{saveId}/clubs/{clubId}/squad` returns an owned Career squad, including attributes, availability, fitness, morale, and form.
- `POST /game/saves/{saveId}/advance-day` moves the Career date forward one day.
- `POST /game/saves/{saveId}/training-focus` stores `BALANCED`, `FITNESS`, `ATTACK`, `DEFENSE`, or `MORALE`.
- `POST /game/saves/{saveId}/next-season` starts a fresh season after the current one is finished.
- `GET /game/saves/{saveId}/standings` derives the league table from completed stored matches.
- `GET /game/saves/{saveId}/player-stats` derives current-season player stats from stored match player stats.
- `GET /game/saves/{saveId}/manager` returns the player manager profile, traits, record, objectives, and board pressure.
- `GET /game/saves/{saveId}/clubs/{clubId}/manager` returns an opponent manager profile.
- `GET /game/saves/{saveId}/manager/decisions` returns recent explained lineup/training decisions.
- `GET /game/saves/{saveId}/jobs` lists filled and vacant manager jobs; `POST /jobs/{clubId}/accept` appoints an unemployed player manager.
- `GET /game/saves/{saveId}/clubs/{clubId}/market` returns budgets, window state, and scouting-limited candidates.
- `POST /game/saves/{saveId}/clubs/{clubId}/scouting/{playerId}` starts or advances a scouting report.
- `GET|POST /game/saves/{saveId}/clubs/{clubId}/offers` lists negotiations or submits a bid.
- `POST /game/saves/{saveId}/clubs/{clubId}/offers/{offerId}/respond|terms|complete` advances a transfer state machine.
- `PATCH /game/saves/{saveId}/clubs/{clubId}/players/{playerId}/transfer-status` lists, delists, or protects a player.
- `POST /game/saves/{saveId}/fixtures/{fixtureId}/play` accepts the managed club lineup/tactic for its home or away fixture, stores that result, then completes the other full-engine AI fixtures in the same matchday.
- `POST /game/saves/{saveId}/matchdays/{matchdayNumber}/complete` retries only scheduled AI fixtures in an incomplete round.
- `GET /game/saves/{saveId}/matches/{matchId}` reloads the deterministic result snapshot.
- `GET /game/saves/{saveId}/matches/{matchId}/events` returns its ordered timeline.

The gateway overwrites identity headers. Clients must not send `X-User-Id` or call `game-service` directly.
