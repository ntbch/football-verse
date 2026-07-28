# Public Web Matchday Editorial — Implementation Plan

**Status:** Ready for implementation  
**Design:** [public-web-matchday-editorial-design.md](./public-web-matchday-editorial-design.md)  
**Scope:** The public product, authenticated user pages, Predictions, and role surfaces. Career is excluded.

## Orchestration Registry

| ID | Owner | Locked scope | Dependency | Completion gate |
| --- | --- | --- | --- | --- |
| UI-1 | UI foundation | `app/globals.css`, `app/layout.tsx`, public shell/navbar/notification components | None | Theme isolation, header behavior, build |
| CONTENT-1 | Content/community | Home, News, Article, Forum, Profile, Search feature directories | UI-1 | Real-data, truthful-state, route-flow checks |
| IMAGE-1 | Content/community | `shared/lib/images.ts` only | UI-1 | No unrelated fallback image/content |
| DATA-1 | Data/roles | `features/predictions/**` | UI-1 | Existing prediction flows, data bounds |
| ROLE-1 | Data/roles | `features/{admin,moderator}/**` | UI-1 | Role guards and operation flows |
| VERIFY-1 | Verification owner | No product-file edits | All implementation tasks | Full gate matrix |

No two implementation tasks may edit the same file. A task is not complete until its evidence is recorded and its listed checks pass. Do not create a repository task-registry database; this document is the durable registry.

## Scope Guard

- **Never change:** `apps/web/src/features/career/**`, Career styles, Career API/hooks, or the `game` shell behavior.
- **Important route finding:** `apps/web/src/app/matches/page.tsx` re-exports the Career Match Centre. Despite its route name, it is Career and is no-touch. `features/matches/_playback.test.ts` remains a regression gate.
- Preserve all existing API paths, query keys, page sizes, mutations, invalidations, refetch intervals, redirects, role guards, uploads, sanitization, and embed origins.
- Do not add dependencies, UI kits, mock content, fake metrics, extra data fetches, or new backend contracts.

## Execution Order

### 1. UI-1 — Public foundation and navigation

**Owner files:** `globals.css`, `layout.tsx`, `page-shell.tsx`, `navbar.tsx`, `navbar-links.tsx`, `notification-menu.tsx`.

- Audit theme selector scope before adding a document attribute. Career shares the application layout, so public dark/light tokens must not recolor Career.
- Add persisted light/dark selection with a pre-paint system-preference fallback. Keep owned rich HTML, embeds, media, and charts outside forced recoloring.
- Consolidate public token usage; preserve the Career stylesheet import and existing `theme-sports`/`theme-community` rules until their uses are proven absent.
- Restyle the sticky header without changing auth/logout, search, notifications, active-route logic, or role links.
- Keep the mobile bell visible for signed-in users. The drawer must trap focus, block background interaction, close via Escape/backdrop, and return focus to its trigger.
- Use visible focus and 44px actual hit areas for user-operated controls.

**Stop/rollback:** Any Career visual change, route/auth/search/notification regression, theme flash, or drawer focus failure reverts UI-1 before feature work begins.

### 2. CONTENT-1 and IMAGE-1 — Home and community/editorial surfaces

**Owner files:** `features/home/**`, `news/**`, `forum/**`, `profile/**`, `search/**`; then `shared/lib/images.ts` only.

- Home keeps `/news?page=0&size=15` and the four-thread preview. Show the latest API-provided headline, not a client-inferred “breaking” item. The news stream is the stable anchor; optional data modules cannot reorder it.
- Separate initial primary-news failure (one page-level retry) from empty data and local optional-module failures.
- Keep all article, forum, profile, and search requests/actions. Redesign feed hierarchy, controls, spacing, focus, and responsive layout only.
- Use only returned category/source/status data. Remove presentation labels inferred from text or small subsets, including “Trending,” “Editor’s Pick,” “Hot,” and unsupported AI/editorial claims.
- Preserve existing rich-content rendering and allowed embeds. Never add a new HTML or embed path.
- Make community empty CTAs authorization-aware. Keep thread, comment, reply, report, lock, pin, best-answer, bookmark, and profile flows unchanged.
- Replace unrelated remote football imagery used as an image fallback with a truthful unavailable-image treatment. Do not fabricate initials, avatars, headlines, or counts.

**Stop/rollback:** Any altered request limit, error rendered as empty data, impossible signed-out CTA, missing discussion action, or fake fallback blocks promotion.

### 3. DATA-1 — Predictions only

**Owner files:** `features/predictions/**` and its existing route re-export only if needed.

- Retain query count/timing, status/round selection, submission payloads, mutation invalidation, login behavior, score constraints, kickoff lock, tabs, and existing state branches.
- Use data-first fixture rows and contained horizontal table scrolling. Improve contrast, focus, and mobile hit areas without adding charts or data.
- When club logo data is absent, show a neutral unavailable visual; do not derive or fabricate team initials.
- Do not change `api.ts`, types, response bounds, or refetch intervals.

**Stop/rollback:** Any change to a pick’s availability, payload, error, standings collapse, request cadence, or body-level overflow reverts DATA-1.

### 4. ROLE-1 — Admin and moderator visual alignment

**Owner files:** `features/admin/**`, `features/moderator/**`; route re-exports remain behaviorally unchanged.

- Inherit colors, typography, focus, and spacing from the foundation only. Keep role navigation, labels, permissions, redirects, operational hierarchy, and status distinction intact.
- Preserve exact current request counts and bounds: dashboard requests, user/news/fixture pagination, forum `size=20`, report filters, upload/crawl actions, and moderator report handling.
- Use local horizontal scroll for wide operational tables; do not reduce, hide, or replace desktop operations with mobile-only behavior.

**Stop/rollback:** Any altered role redirect, authorization behavior, mutation, confirmation, toast/error path, or ambiguous operational status reverts ROLE-1.

## Verification Gates

Run after every surface group:

```powershell
git diff --check
npm --prefix .\apps\web run build
```

Run before final acceptance:

```powershell
node --test --experimental-strip-types apps/web/src/features/career/_navigation.test.ts apps/web/src/features/matches/_playback.test.ts apps/web/tests/auth-privacy.test.ts
powershell -ExecutionPolicy Bypass -File scripts/verify.ps1
```

`scripts/verify.ps1` is the full release gate when its environment prerequisites are available. Do not add a test framework solely for this visual work.

For each implementation group, record three production-build measurements using the same browser, viewport, network, and real-data environment. Median LCP and INP may not regress by more than 10%; CLS must stay at or below 0.1. The redesigned route cannot add requests merely to compose its UI.

Manual real-data checks at 375px, 768px, 1024px, and 1440px in light and dark modes:

- Public shell: header/search/auth/logout/notifications, drawer keyboard flow, focus return, no owned page overflow, and Career unchanged.
- Home/editorial/community: actual data, initial error/empty/local-error states, auth-aware CTAs, rich article/embed, discussion actions, profile and search flows.
- Predictions: upcoming/live/results states, auth submission/locked pick, standings/table containment, real/absent AI/leaderboard/stats data.
- Roles: non-auth and non-role redirects, role routes, tables/charts, operation errors and confirmations against safe/disposable data.
- Representative rich article, allowed embed, chart, image, table, admin shell, and moderator shell. If unavailable, verify and record its truthful unavailable state; never substitute mock data.

## Delivery Rules

- Each surface group is independently releasable and must be reverted alone if its gate fails.
- Record final changed-file scope before marking a task done. Reject incidental changes outside its lock.
- Keep code changes as small as possible; extract a shared component only after a second concrete use proves it.
