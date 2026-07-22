# PROJECT.md - Football Verse

> This file is the main context document for AI coding agents and developers working on this repository.
>
> Every agent must read this file before generating, editing, or refactoring code.

---

# 1. Project Overview

## 1.1 Project Name

**Football Verse**

## 1.2 Project Type

Football Verse is a full-stack web application combining:

- Football news
- Football forum
- User community
- Dedicated admin dashboard
- Basic notifications
- Future match prediction
- Future Football Manager Lite simulation
- Future Python match engine

## 1.3 Main Goal

The goal is to build a modern football platform where users can:

- Read football news.
- Discuss football topics in forums.
- Like, comment, bookmark, and share articles.
- Create threads and reply to discussions.
- Receive notifications.
- Predict real football match results in a later phase.
- Manage a simulated football club in a later phase.
- Watch simulated match timelines in a later phase.

## 1.4 Current Development Priority

The first development milestone is:

**Phase 1: News & Forum**

Phase 1 required scope:

- Authentication
- User profile
- News CMS
- RSS crawling
- News listing and detail
- Like system
- Bookmark system
- Nested comments
- Forum categories
- Forum threads
- Forum replies
- Report system
- Dedicated admin shell
- Basic admin CMS
- Basic notification storage/API

Later modules must be designed around, but not implemented before Phase 1 is stable:

- Match prediction
- Football Manager Lite
- Python match engine
- PvP
- Tournaments
- Push notifications

Optional later infrastructure:

- Redis cache
- MinIO or S3 object storage
- Elasticsearch or OpenSearch

---

# 2. Product Vision

Football Verse should become a football social platform where news, community discussion, prediction, and game mechanics can live in one ecosystem.

It is not just a news website. It should be modular enough to grow into:

- A football news portal
- A football discussion forum
- A match prediction platform
- A Football Manager Lite game
- A real-time match simulation platform
- An admin-controlled content and moderation system

---

# 3. Target Users

## 3.1 Normal Users

Normal users can:

- Register and log in.
- View football news.
- Comment on articles.
- Like articles.
- Bookmark articles.
- Share articles.
- Create forum threads.
- Reply to forum posts.
- Mention other users.
- Report inappropriate content.
- Receive notifications.

## 3.2 Moderators

Moderators can:

- Review reported content.
- Hide inappropriate forum posts.
- Lock forum threads.
- Pin important threads.
- Moderate toxic comments.
- Moderate future live chat.

## 3.3 Admins

Admins can:

- Manage users.
- Manage roles.
- Ban, mute, or restore accounts.
- Manage news articles.
- Manage news categories and tags.
- Manage RSS sources.
- Manage forum categories.
- Manage reported content.
- Manage prediction data in future phases.
- Manage game data in future phases.
- Reset game seasons in future phases.
- Edit player attributes in future phases.

---

# 4. Development Phases

## Phase 1 - News & Forum

This is the current priority.

Required:

- Auth
- User profile
- News CMS
- RSS crawler
- Article like/bookmark/share
- Nested article comments
- Forum categories
- Forum threads
- Forum replies
- Rich-text editor
- Image upload interface
- Mentions
- Reports
- Admin dashboard shell
- Admin news/forum/report management
- Basic notifications

Do not build Prediction, Football Manager, or the Python Match Engine during Phase 1 unless explicitly requested.

## Phase 2 - Prediction

Future scope:

- Real football fixtures.
- Real match results.
- User predictions.
- Coin or point-based prediction.
- Weekly and monthly leaderboard.
- Rewards.

Use provider adapters plus seed data first. Do not make the project depend on a paid API key during early development.

## Phase 3 - Football Manager Lite

Future scope:

- Club management.
- Squad management.
- Player attributes.
- Formation management.
- Tactic configuration.
- Transfer market.
- PvE match simulation.

## Phase 4 - PvP and Tournament

Future scope:

- PvP matchmaking.
- Elo ranking.
- Friendly matches.
- League tournaments.
- Knockout tournaments.
- Live match chat.
- Push notifications.

---

# 5. Technology Stack

## 5.1 Frontend

Main stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand
- Axios or fetch wrapper
- React Hook Form
- Zod
- Tiptap or Quill for rich text editing

Routing should use Next.js routes.

## 5.2 Backend

Main stack:

- Java 21
- Spring Boot 3
- Spring Security
- JWT authentication
- Spring Data JPA
- Spring Validation
- Spring WebSocket in later real-time phases
- Spring Scheduler for RSS crawling
- PostgreSQL driver
- Lombok
- MapStruct only if mapping becomes repetitive enough to justify it

## 5.3 Python Match Engine

Future stack:

- Python
- FastAPI
- NumPy
- Pandas
- Pydantic
- Uvicorn
- mplsoccer
- seaborn

Python is only for future simulation, statistics, AI behavior, and data jobs. It must not handle authentication, users, news, forum, or admin logic.

## 5.4 Database and Infrastructure

Required:

- PostgreSQL
- Docker
- Docker Compose

Optional later:

- Redis for cache and rate limiting
- MinIO or Amazon S3 for object storage
- Nginx for production reverse proxy
- GitHub Actions for CI/CD

---

# 6. System Architecture

## 6.1 High-level Architecture

```text
Next.js Frontend
      |
      | REST API
      v
Spring Boot Backend
      |
      | JPA
      v
PostgreSQL

Future:

Spring Boot Backend
      |
      | Internal REST API
      v
Python Match Engine
```

## 6.2 Backend Responsibility

Spring Boot is responsible for:

- Authentication
- Authorization
- User management
- News management
- RSS crawling
- Forum management
- Comment system
- Like system
- Bookmark system
- Report system
- Notification API
- Dedicated admin APIs
- Prediction in future
- Football data management in future
- WebSocket gateway in future

## 6.3 Admin Responsibility

Admin is a separate management area, not a public user feature.

Admin requirements:

- Frontend route prefix: `/admin/*`
- Dedicated admin layout and sidebar
- Role guard for admin pages
- Admin API prefix: `/api/v1/admin/*`
- Admin UI must not be mixed into public user screens
- Admin logic must not be mixed into public API controllers

Phase 1 admin scope:

- Admin dashboard home
- User management
- News article management
- News category/tag management
- RSS source management
- Forum category management
- Forum thread/post moderation
- Report management

Future admin scope:

- Prediction fixtures and rewards
- Clubs
- Players
- Player attributes
- Game seasons
- Tournaments
- Virtual economy

---

# 7. Repository Structure

Recommended greenfield structure:

```text
football-verse/
|
|-- project.md
|-- README.md
|-- docker-compose.yml
|
|-- backend/
|   |-- src/
|   |-- pom.xml
|   |-- Dockerfile
|
|-- frontend/
|   |-- src/
|   |-- package.json
|   |-- next.config.ts
|   |-- Dockerfile
|
|-- match-engine/
|   |-- app/
|   |-- requirements.txt
|   |-- Dockerfile
|
|-- docs/
|   |-- API.md
|   |-- DATABASE.md
|   |-- ARCHITECTURE.md
|   |-- TASKS.md
```

The `match-engine` folder may exist as a placeholder, but real simulation work belongs to later phases.

---

# 8. Backend Package Structure

Use modular package organization:

```text
backend/src/main/java/com/footballverse/
|
|-- auth/
|-- user/
|-- news/
|-- forum/
|-- notification/
|-- report/
|-- admin/
|-- common/
|   |-- exception/
|   |-- response/
|   |-- pagination/
|   |-- util/
|-- config/
```

Rules:

- Controller handles HTTP only.
- Service contains business logic.
- Repository handles database access.
- Do not put business logic in controllers.
- Do not return JPA entities directly from APIs.
- Use DTOs for API requests and responses.
- Use Jakarta Validation for inputs.
- Use global exception handling.
- Use transactions in service layer where needed.

---

# 9. Frontend Structure

Use Next.js routes and feature-based modules:

```text
frontend/src/
|
|-- app/
|   |-- layout.tsx
|   |-- page.tsx
|   |-- news/
|   |-- forum/
|   |-- profile/
|   |-- admin/
|       |-- layout.tsx
|       |-- page.tsx
|       |-- users/
|       |-- news/
|       |-- forum/
|       |-- reports/
|
|-- features/
|   |-- auth/
|   |-- users/
|   |-- news/
|   |-- forum/
|   |-- admin/
|   |-- notifications/
|
|-- shared/
|   |-- components/
|   |-- hooks/
|   |-- lib/
|   |-- types/
```

Frontend rules:

- Use TypeScript.
- Use functional components.
- Use Tailwind CSS.
- Use TanStack Query for server state.
- Use Zustand only for global client state.
- Use React Hook Form and Zod for forms.
- Do not call APIs directly inside UI components.
- Keep API clients in feature services or shared API utilities.
- Keep admin UI separate under `/admin/*`.
- Hide future modules until they exist.

---

# 10. API Design

## 10.1 Prefixes

All APIs must use versioned prefixes:

```text
/api/v1/...
```

Admin APIs must use:

```text
/api/v1/admin/...
```

Examples:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me

GET    /api/v1/news
GET    /api/v1/news/{slug}
POST   /api/v1/news/{id}/like
POST   /api/v1/news/{id}/bookmark
POST   /api/v1/news/{id}/comments

GET    /api/v1/forum/categories
GET    /api/v1/forum/categories/{slug}/threads
GET    /api/v1/forum/threads/{slug}
POST   /api/v1/forum/threads
POST   /api/v1/forum/threads/{id}/replies

GET    /api/v1/notifications
PATCH  /api/v1/notifications/{id}/read

GET    /api/v1/admin/users
GET    /api/v1/admin/news
POST   /api/v1/admin/news
GET    /api/v1/admin/news/sources
POST   /api/v1/admin/news/crawl
GET    /api/v1/admin/forum/reports
PATCH  /api/v1/admin/forum/reports/{id}/resolve
```

## 10.2 Response Convention

Use a common response wrapper:

```json
{
  "success": true,
  "message": "Request successful",
  "data": {},
  "timestamp": "2026-07-03T10:00:00Z"
}
```

Paginated response:

```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    "content": [],
    "page": 0,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5
  },
  "timestamp": "2026-07-03T10:00:00Z"
}
```

Error response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ],
  "timestamp": "2026-07-03T10:00:00Z"
}
```

## 10.3 REST Rules

- Use plural nouns.
- Use `GET` for reads.
- Use `POST` for creation and commands.
- Use `PUT` for full update.
- Use `PATCH` for partial update.
- Use `DELETE` for deletion.
- Paginate every list endpoint.
- Use filters through query params.

---

# 11. Auth and User Module

## 11.1 Features

- Register
- Login
- Logout
- Refresh token
- Current user endpoint
- Role-based authorization
- User profile
- Avatar upload interface

## 11.2 Roles

- `USER`
- `MODERATOR`
- `ADMIN`

## 11.3 Security Rules

- Hash passwords with BCrypt.
- JWT access token should be short-lived.
- Refresh token should be revocable.
- Admin endpoints require `ADMIN`.
- Moderator endpoints require `MODERATOR` or `ADMIN`.
- Public news and forum read endpoints can be anonymous.
- Like, bookmark, comment, report, and thread creation require login.

---

# 12. News Module

## 12.1 Purpose

The News module provides football news from:

- RSS feeds
- Future third-party news APIs
- Manual admin CMS posts

## 12.2 Phase 1 Features

- Latest news
- Category-based news
- Tag-based news
- Search
- News detail
- Like article
- Bookmark article
- Share article
- Nested comments
- Admin CMS
- RSS source management
- RSS crawling
- Duplicate detection

## 12.3 RSS Workflow

```text
RSS Feed
    |
    v
Spring Scheduler
    |
    v
RSS Crawler Service
    |
    v
Parse and Normalize Article Data
    |
    v
Duplicate Detection
    |
    v
Save to PostgreSQL
    |
    v
Expose via /api/v1/news
```

Recommended scheduler interval:

- Development: 5 minutes
- Production: 10 to 15 minutes

## 12.4 Duplicate Detection

Use database constraints first:

- Unique `source_url`
- Fallback `content_hash` based on title, source, and published date

## 12.5 Article Status

- `DRAFT`
- `PUBLISHED`
- `ARCHIVED`
- `DELETED`

RSS-crawled articles normally become `PUBLISHED`.
Admin-written articles may start as `DRAFT`.

## 12.6 Core Tables

- `news_sources`
- `news_categories`
- `news_articles`
- `news_tags`
- `news_article_tags`
- `news_likes`
- `news_bookmarks`
- `news_comments`

---

# 13. Forum Module

## 13.1 Purpose

The Forum module provides a football discussion community where users can create topics and participate in conversations.

## 13.2 Phase 1 Features

- Forum categories
- Threads
- Replies/posts
- Rich text content
- Tags
- Mentions
- Likes
- Reports
- Pin thread
- Lock thread
- Hide inappropriate content

## 13.3 Recommended Categories

- Premier League
- Championship
- League One
- League Two
- Transfers
- Matchday
- Tactics
- Fantasy Football
- General Football

## 13.4 Core Tables

- `forum_categories`
- `forum_threads`
- `forum_posts`
- `forum_tags`
- `forum_thread_tags`
- `forum_likes`
- `forum_attachments`
- `forum_reports`

## 13.5 Rich Text Rules

- Rich text must be sanitized on the backend.
- Users may insert links, images, videos, and embeds only through allowed formats.
- Prevent XSS.
- Store either sanitized HTML or editor JSON, but keep the choice consistent.

## 13.6 Moderation Rules

- Users can edit or delete their own threads and replies.
- Moderators can hide posts.
- Admins can delete content permanently.
- Locked threads cannot receive new replies.
- Pinned threads appear at the top.
- Reported content appears in the Admin Dashboard.

---

# 14. Notification Module

## 14.1 Phase 1 Scope

Phase 1 uses PostgreSQL and REST only:

- Store notifications.
- List user notifications.
- Mark one notification as read.
- Mark all notifications as read.

Initial notification types:

- `NEWS_COMMENT_REPLY`
- `NEWS_COMMENT_LIKE`
- `FORUM_REPLY`
- `FORUM_MENTION`
- `THREAD_LIKE`
- `THREAD_LOCKED`
- `REPORT_RESOLVED`
- `SYSTEM_ANNOUNCEMENT`

Future:

- WebSocket real-time notifications
- Firebase Cloud Messaging
- Browser push notifications

---

# 15. Admin Dashboard

## 15.1 Purpose

Admin Dashboard is a dedicated management product inside Football Verse.

It must be built as a separate admin area with:

- `/admin/*` frontend routes
- Admin layout
- Admin sidebar
- Admin route guard
- Admin-only API calls
- Role-aware screens

Do not mix admin screens into public user pages.
Do not mix admin API logic into public controllers.

## 15.2 Phase 1 Admin Pages

- `/admin`
- `/admin/users`
- `/admin/news`
- `/admin/news/new`
- `/admin/news/sources`
- `/admin/forum`
- `/admin/reports`
- `/admin/settings`

## 15.3 Phase 1 Admin Features

- View dashboard summary.
- Manage users.
- Manage roles where needed.
- Ban, mute, or restore users.
- Manage news articles.
- Manage news categories.
- Manage news tags.
- Manage RSS sources.
- Trigger manual RSS crawl.
- Manage forum categories.
- Pin, lock, hide, or restore forum threads.
- Hide or restore forum posts.
- Review and resolve reports.

## 15.4 Future Admin Features

- Manage prediction fixtures.
- Manage leaderboard rewards.
- Manage clubs.
- Manage players.
- Edit player attributes.
- Reset game seasons.
- Manage tournaments.
- Manage virtual economy.

---

# 16. Prediction Module

This module belongs to Phase 2.

## 16.1 Purpose

Allow users to predict real football match results.

## 16.2 Future Features

- Fetch real fixtures from a third-party provider.
- Display upcoming matches.
- User predicts score or match result.
- Lock predictions before kickoff.
- Compare prediction with real result.
- Reward users with points or coins.
- Weekly leaderboard.
- Monthly leaderboard.

## 16.3 Data Source Rule

Start with:

- Provider adapter interface
- Seed fixtures
- Seed results

Do not block early development on API-Football, Sportmonks, or any paid provider.

---

# 17. Football Manager Lite Module

This module belongs to Phase 3.

## 17.1 Purpose

Allow users to manage a virtual football club and simulate matches.

## 17.2 Future Features

- Club management
- Squad management
- Player attributes
- Formation management
- Tactical settings
- Transfer market
- PvE match simulation
- PvP in later phases
- Elo ranking in later phases
- Tournaments in later phases

## 17.3 Future Concepts

Club:

- Name
- Logo
- League
- Budget
- Squad
- Manager user

Player:

- Name
- Age
- Nationality
- Position
- Overall rating
- Potential
- Attributes
- Contract
- Market value

Tactic:

- Formation
- Pressing
- Tempo
- Passing style
- Defensive line
- Attacking width
- Mentality

---

# 18. Python Match Engine

This module belongs to Phase 3.

## 18.1 Purpose

The Python Match Engine is responsible for football match simulation.

## 18.2 Future Components

- Formation engine
- Player engine
- Tactical engine
- Simulation engine
- Event generator
- Statistics engine
- AI opponent

## 18.3 Future API

Spring Boot calls Python internally.

```text
POST /simulate
```

Python returns:

- Match score
- Winner
- Timeline
- Match statistics
- Player ratings

Do not put match simulation logic inside Spring Boot controllers.
Do not put authentication or user management in Python.

---

# 19. Database Overview

## 19.1 Phase 1 Tables

Auth:

- `users`
- `roles`
- `user_roles`
- `refresh_tokens`

User:

- `user_profiles`

News:

- `news_sources`
- `news_categories`
- `news_articles`
- `news_tags`
- `news_article_tags`
- `news_likes`
- `news_bookmarks`
- `news_comments`

Forum:

- `forum_categories`
- `forum_threads`
- `forum_posts`
- `forum_tags`
- `forum_thread_tags`
- `forum_likes`
- `forum_attachments`
- `forum_reports`

Notification:

- `notifications`

## 19.2 Future Tables

Prediction:

- `fixtures`
- `predictions`
- `prediction_scores`
- `leaderboards`

Football Manager:

- `leagues`
- `clubs`
- `players`
- `player_attributes`
- `squads`
- `formations`
- `tactics`
- `transfers`
- `match_histories`
- `match_events`

## 19.3 Database Rules

- Table names use `snake_case`.
- Column names use `snake_case`.
- Primary key column should be `id`.
- Foreign key format should be `{table_singular}_id`.
- Use `created_at` and `updated_at` where needed.
- Use status fields for moderation.
- Add indexes for foreign keys.
- Add unique constraints where needed.
- Do not store raw passwords.
- Do not store image binary in the database.

---

# 20. Security and Validation

Rules:

- Use HTTPS in production.
- Hash passwords with BCrypt.
- Protect admin endpoints.
- Validate all inputs.
- Sanitize rich text HTML.
- Prevent XSS.
- Use JPA/repositories to avoid raw SQL injection risks.
- Configure CORS carefully.
- Validate uploaded files.
- Rate limit login in a later infrastructure phase.

Validation examples:

- Title must not be blank.
- Content must not be blank.
- Email must be valid.
- Password must meet minimum length.
- Category must exist.
- Source URL must be valid.
- Comment content must not exceed maximum length.

---

# 21. File Upload Rules

Phase 1 can start with an interface and local/dev storage.

Future production storage:

- MinIO
- Amazon S3
- S3-compatible provider

Rules:

- Do not store files directly in the database.
- Allowed image types: `jpg`, `jpeg`, `png`, `webp`.
- Recommended max image size: 5 MB.
- Validate uploaded files before use.

---

# 22. Search Strategy

Phase 1:

- PostgreSQL full-text search.

Future:

- Elasticsearch or OpenSearch.

Search domains:

- News title
- News summary
- News content
- News tags
- Forum thread title
- Forum post content

---

# 23. UI/UX Guidelines

## 23.1 General Style

The UI should feel like a modern football community product:

- Clean layout
- Fast browsing
- Clear navigation
- Sports-focused content density
- Mobile responsive
- Dark mode later

## 23.2 Public Navigation

Phase 1 public navigation:

- Home
- News
- Forum
- Profile

Future navigation:

- Prediction
- Manager

Admin navigation must not be shown as a normal public feature. Admin users can access it through a protected admin entry.

## 23.3 Admin Navigation

Admin sidebar:

- Dashboard
- Users
- News
- RSS Sources
- Forum
- Reports
- Settings

Future admin items:

- Prediction
- Game Data
- Players
- Seasons
- Tournaments

---

# 24. AI Agent Instructions

## 24.1 General Rules

- Always read this `project.md` before coding.
- Do not change the project architecture without explicit request.
- Do not create random new patterns.
- Follow the folder structure.
- Keep modules separated.
- Do not mix News logic with Forum logic.
- Do not mix Admin UI with public UI.
- Do not mix Admin API logic with public API logic.
- Do not implement Football Manager before Phase 1 is stable.
- Do not implement Prediction before News and Forum basics are done.
- Do not implement the Python Match Engine before it is explicitly requested.

## 24.2 Backend Rules

When generating Spring Boot code:

- Use Java 21.
- Use Spring Boot 3.
- Use layered architecture.
- Create Entity, Repository, Service, Controller, DTO, and Mapper only when needed.
- Do not return Entity directly.
- Use DTOs for request and response.
- Use Jakarta Validation.
- Add transaction boundaries in service layer.
- Use `@Transactional` where needed.
- Use constructor injection.
- Avoid field injection.
- Use meaningful exception classes.
- Use global exception handler.
- Use pagination for list endpoints.

## 24.3 Frontend Rules

When generating frontend code:

- Use Next.js.
- Use React.
- Use TypeScript.
- Use functional components.
- Use Tailwind CSS.
- Use TanStack Query for server state.
- Use Zustand only for global client state.
- Use React Hook Form for forms.
- Use Zod for validation.
- Do not put API calls directly inside UI components.
- Keep reusable UI in shared components.
- Keep public app pages and admin pages separate.
- Avoid `any`.

## 24.4 News Rules

When working on News:

- Support both RSS-crawled and admin-created articles.
- Never assume article source is always internal.
- Always check duplicates by `source_url` or `content_hash`.
- Use slug for public article URLs.
- Support category and tags.
- Keep like and bookmark separate.
- Comments must support `parent_id`.
- Admin CMS must support draft and publish.

## 24.5 Forum Rules

When working on Forum:

- Category contains threads.
- Thread contains posts/replies.
- Thread author is a user.
- Post author is a user.
- Thread may be pinned or locked.
- Moderator can hide content.
- User can report content.
- Rich text must be sanitized.
- Mention should create notification.

## 24.6 Admin Rules

When working on Admin:

- Use `/admin/*` frontend routes.
- Use `/api/v1/admin/*` backend routes.
- Require admin or moderator authorization depending on the screen.
- Keep admin screens out of public user navigation.
- Keep admin API logic separate from public API logic.
- Admin can manage Phase 1 content, users, RSS sources, forum moderation, and reports.

---

# 25. Development Roadmap

## Milestone 1 - Project Setup

- Create backend Spring Boot project.
- Create frontend Next.js project.
- Create PostgreSQL Docker service.
- Configure environment variables.
- Create base response wrapper.
- Create global exception handler.

## Milestone 2 - Authentication

- User registration.
- User login.
- JWT token.
- Refresh token.
- Role-based authorization.
- Current user endpoint.

## Milestone 3 - Admin Shell

- Admin route group.
- Admin layout.
- Admin sidebar.
- Admin route guard.
- Admin dashboard placeholder.

## Milestone 4 - News Core

- News category CRUD.
- News tag CRUD.
- News article CRUD.
- News list API.
- News detail API.
- Admin news editor.
- Article slug generation.
- Article status.

## Milestone 5 - RSS Crawler

- News source table.
- RSS source CRUD.
- Scheduler.
- RSS parser.
- Duplicate detection.
- Auto-save articles.
- Manual admin crawl action.

## Milestone 6 - News Interaction

- Like article.
- Bookmark article.
- Comment article.
- Nested comments.
- Share button frontend.

## Milestone 7 - Forum Core

- Forum category CRUD.
- Thread CRUD.
- Reply CRUD.
- Thread detail page.
- Category thread page.

## Milestone 8 - Forum Interaction and Reports

- Like thread.
- Like post.
- Report thread.
- Report post.
- Pin thread.
- Lock thread.
- Hide post/thread.
- Admin report review.

## Milestone 9 - Notifications

- Notification table.
- Notification API.
- Mention notification.
- Reply notification.
- Comment reply notification.

## Milestone 10 - Prediction

Future.

## Milestone 11 - Football Manager

Future.

## Milestone 12 - Python Match Engine

Future.

---

# 26. Definition of Done

A feature is done when:

- Backend API works.
- Frontend UI works.
- Input validation exists.
- Errors are handled.
- Data is persisted correctly.
- DTOs are used.
- No Entity is returned directly.
- Role permission is respected.
- Basic tests are added when logic is non-trivial.
- Code follows project structure.
- No unrelated files are modified.

---

# 27. First Implementation Recommendation

Recommended first implementation order:

```text
1. Backend base structure
2. Frontend Next.js base structure
3. PostgreSQL Docker setup
4. Common response wrapper
5. Global exception handler
6. Auth module
7. User module
8. Admin shell
9. News category
10. News tag
11. News article
12. RSS source
13. RSS crawler
14. News comments
15. News likes
16. News bookmarks
17. Forum category
18. Forum thread
19. Forum reply
20. Forum reports
21. Admin moderation pages
22. Basic notifications
```

Do not start Football Manager until News, Forum, and Admin are working.

---

# 28. Final Notes

Football Verse must be developed as a long-term modular system.

The first priority is not to build every feature quickly. The first priority is to build a clean Phase 1 foundation:

- Authentication
- News
- RSS
- Forum
- Admin
- Reports
- Basic notifications

After this foundation is stable, the system can expand into:

- Match prediction
- Football Manager Lite
- Python Match Engine
- PvP
- Tournaments
- Live chat
- Push notifications

Keep the code understandable for future developers and AI agents.

---

# End of PROJECT.md
