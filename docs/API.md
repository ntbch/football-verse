# API

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
- `GET|POST /admin/news/sources` lists and creates RSS sources.
- `PATCH /admin/news/sources/{id}/toggle` toggles RSS source activity.
- `DELETE /admin/news/sources/{id}` deletes an RSS source.
- `POST /admin/news/crawl` runs a manual RSS crawl.

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
