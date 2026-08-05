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

Rich article HTML permits iframe embeds only from YouTube and Brightcove (`youtube.com`, `youtube-nocookie.com`, and `players.brightcove.net`).

- `GET /news` lists published articles.
- `GET /news/{slug}` returns one published article.
- `GET /news/{slug}/comments` lists comments for a published article.
- `POST /news/{id}/like` toggles the current user's like.
- `POST /news/{id}/bookmark` toggles the current user's bookmark.
- `POST /news/{id}/comments` creates a comment.

## Predictions

- `GET /predictions/leaderboard/me?period=weekly|monthly|all` returns the authenticated user's rank, points, and outcome accuracy for the selected period. Accuracy counts only Core fixtures that have been scored.
- `GET /predictions/{fixtureId}/community-distribution` returns server-counted home/draw/away pick totals for the fixture; it is not an AI estimate.

- `GET /predictions/{fixtureId}/score-log` returns the authenticated user’s latest scored breakdown for one Core fixture. It includes the points earned per market and a server-generated reason.

- `GET /predictions/leagues?page=0&size=10` returns the authenticated user's private leagues as
  `PageResponse` (`content`, `page`, `size`, `totalElements`, `totalPages`). `page` is clamped
  to `0..10000`; `size` is clamped to `1..20`. Each league includes its top five members; only
  the owner receives its invite code.
- `GET /predictions/leaderboard/page?period=weekly|monthly|all&page=0&size=20` returns a public
  `PageResponse` leaderboard. Weekly and monthly entries include only scored fixtures; `page` is
  clamped to `0..10000` and `size` to `1..50`.
- `GET /predictions/stats` returns the authenticated user's personal prediction totals, streaks,
  and badges; it is not a public leaderboard endpoint.
- `POST /predictions/leagues` creates a private league and returns its owner-only invite code.
  It requires an `X-Request-ID` header containing a UUID. Reuse that same UUID for a retry: the
  original league is returned and no second league is created. A request ID belongs to one account
  and must not be reused by another.
- `POST /predictions/leagues/join` joins a league by code. Joining is retry-safe; rankings only include members.

## User collections

- `GET /users/me/bookmarked-articles` returns the current user's bookmarked published articles.
- `GET /users/me/follows` lists durable club, league, player, and topic follows.
- `PUT /users/me/follows` sets one follow to its requested desired state; it is retry-safe and returns the resulting state.
- `GET /users/me/following-feed?limit=10` returns bounded published stories with the follow target(s) that matched each story.
- `GET /users/me/notification-preferences` returns current notification choices. `PATCH` updates supplied
  `forumReplies` and/or `predictionScored` fields; Core applies them before creating those notifications.

## Daily minigames

Daily minigames are served by Core at `/minigames`; the public page is `/games`.
ESPN is the minigame roster source and TheSportsDB enriches historical facts only. `football-data.org` remains a predictions source.

- `GET /minigames/daily` returns the Vietnam-local daily snapshots for Who Am I? and Football Grid. The
  response never contains answers or accepted aliases. It includes an authenticated user's official attempt
  when present.
- `POST /minigames/daily/who-am-i|grid/attempt?practice=false` creates or resumes the current user's official
  attempt. Set `practice=true` only after the official attempt is complete; practice attempts are unranked.
- `GET /minigames/players?q=...` requires authentication and returns up to eight catalog autocomplete choices.
- `POST /minigames/attempts/{id}/guess` accepts a catalog `playerId`, the attempt `version`, and a Grid `cell`
  when applicable. Stale versions return `409` and must refetch before retrying; a Grid player cannot be reused
  after being named in any cell.
- `POST /minigames/attempts/{id}/reveal` reveals the next Who Am I? clue with the attempt `version`.
- `GET /minigames/leaderboard?scope=combined|who-am-i|grid` is public and returns the daily top entries plus
  the authenticated user's rank when applicable.

An official attempt is unique per user, game, and Vietnam-local date. The first completed official attempt
is the only one ranked. API keys, raw provider responses, answers, and aliases are never returned until the
eligible attempt has completed.

## Forum and moderation

- `GET /forum/categories` lists forum categories.
- `GET /forum/categories/{slug}/threads` lists visible threads.
- `GET /forum/categories/{slug}/threads?unanswered=true` lists visible threads without a server-marked best answer.
- `GET /forum/categories/{slug}/threads?following=true` lists the current user's followed visible threads in that category. `following` and `unanswered` are mutually exclusive. Pages are bounded to 50 items.
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
- `DELETE /notifications/{id}` deletes one current-user notification. A missing
  or another user's notification returns `404`.

## Uploads

Uploads are public article-media assets, not a private-file store. `POST /uploads`
accepts JPEG, PNG, GIF, and WebP only from an administrator; `GET /uploads/{filename}`
is public so published articles and Telegram previews can use the returned URL. Do
not upload user documents, private avatars, credentials, or personal data.

Uploaded bytes are retained with Core backups until a supported deletion and
reference-counting workflow exists. Soft-deleting an article does not currently
delete its uploaded asset.

News engagement counts are informational; only the labeled Like and Bookmark
controls issue mutations.

## Premium billing (SePay)

Billing is disabled by default (`BILLING_ENABLED=false` and `BILLING_SALES_ENABLED=false`). When enabled,
plans are exposed by `GET /billing/plans`; authenticated users can read `GET /billing/me`, create an order
with `POST /billing/orders` (required UUID `X-Request-ID`), inspect their order, cancel an unpaid order with
`POST /billing/orders/{invoiceNumber}/cancel`, hide a cancelled/expired history item with
`DELETE /billing/orders/{invoiceNumber}`, and list history. Only one `PENDING` order is allowed per user.
The server catalog exposes four fixed periods: 30, 90, 180, and 365 days; prices, currency, and duration are
never accepted from the browser.
Creating a second pending order returns `409 Conflict` until the existing order is paid or cancelled.
The browser
posts the server-generated checkout fields to the configured SePay checkout host; it never marks an order paid.

SePay IPN is accepted only at `POST /billing/webhooks/sepay` with the configured `X-Secret-Key`. Core verifies
the invoice, VND amount, payment method, provider status, and unique provider event before granting Premium.
Unknown or mismatched events are retained as `REVIEW_REQUIRED`; duplicate events are acknowledged without a
second membership grant. Recurring billing is not enabled.

Administrators can perform a read-only provider lookup with
`GET /admin/billing/orders/{invoiceNumber}/reconcile`; it never grants or revokes
Premium and returns `DISABLED`, `MATCH`, `MISMATCH`, or a safe provider error.

## Career transition

Career and Match Engine routes are retired from the active development topology.
`/career` remains a compatibility redirect to `/games`; the Career database and
backup are preserved outside the application runtime until the approved data
retention window ends.
