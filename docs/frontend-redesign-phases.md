# Frontend Redesign Phases

## Understanding

- Rebuild the full frontend UI as one coherent product, not isolated screens.
- Scope includes all current user, admin, and moderator routes.
- Keep the existing Next.js project shell: package files, configs, Dockerfile, and installed dependencies.
- Delete the current `frontend/src/` implementation before rebuilding.
- Delete `.next/` cache after `src/` removal.
- Use `@astryxdesign/core` and `@astryxdesign/theme-neutral`.
- Visual direction: Editorial Football Magazine, matching the selected reference: rounded cream magazine frame, bold issue marker, compact top navigation, large stadium hero image, top story cards, latest-news rail, and mobile preview.

## Route Inventory

User-facing routes:

- `/`
- `/login`
- `/register`
- `/search`
- `/news`
- `/news/[slug]`
- `/matches`
- `/forum`
- `/forum/threads/[slug]`
- `/forum/categories/[slug]`
- `/predictions`
- `/profile`

Admin routes:

- `/admin`
- `/admin/users`
- `/admin/reports`
- `/admin/news`
- `/admin/news/new`
- `/admin/news/[id]`
- `/admin/news/sources`
- `/admin/forum`
- `/admin/settings`

Moderator routes:

- `/moderator`
- `/moderator/reports`

## Design Direction

Dominant direction: Editorial Football Magazine.

- Cream/light editorial surfaces.
- Large serif headlines.
- Strong article-first hierarchy.
- Rounded magazine frame with compact publication navigation.
- Real football imagery for hero and primary cards.
- Top story card grid, latest-news rail, and mobile preview motif.
- Polished placeholders when API data lacks images.

Supporting layers:

- Sports Command Center for matches, predictions, analytics, admin stats.
- Fan Community Arena for forum, discussion, reactions, and prediction activity.

## Non-Functional Requirements

- Performance: keep routes light, avoid heavy animation and new dependencies unless necessary.
- Accessibility: keyboard navigation, visible focus, semantic landmarks, readable contrast.
- Responsiveness: every route must work cleanly on mobile, tablet, and desktop.
- Reliability: loading, empty, and error states for data pages.
- Security: preserve auth/API boundaries; no secrets in client code.
- Maintainability: shared tokens, app shell, and a small component set; no speculative abstractions.

## Phases

### Phase 0: Reset And Audit

- Delete `frontend/src/`.
- Delete `frontend/.next/`.
- Keep Next.js configs, package files, Dockerfile, and `node_modules`.
- Recreate only the minimum `src` structure needed to start the redesign.

Done when:

- Old UI files are gone.
- Project shell remains intact.

### Phase 1: Design System Foundation

- Define global CSS tokens for editorial color, typography, spacing, borders, and focus.
- Import Astryx core CSS and theme-neutral.
- Create root layout and providers.
- Set image, placeholder, card, button, input, and page-section rules.

Done when:

- A blank app can render with the new visual language.
- Tokens support user, admin, and moderator surfaces.

### Phase 2: App Shell

- Build the primary public shell.
- Build admin/moderator shell variants.
- Add responsive navigation and route hierarchy.
- Add shared loading, empty, and error blocks.

Done when:

- All route groups have consistent framing.
- No page owns navigation styling.

### Phase 3: Auth

- Build login and register.
- Keep existing auth flow and API behavior.
- Use Astryx form components where they fit.
- Add editorial image/identity treatment without blocking form usability.

Done when:

- Auth works on mobile and desktop.
- Form errors are readable and accessible.

### Phase 4: User-Facing Core

- Build home, search, news list, news detail, matches, forum, thread detail, category detail, predictions, and profile.
- Use real images for hero/primary cards.
- Use polished placeholders for missing image data.

Done when:

- All user-facing routes have coherent editorial UI.
- Data-heavy areas use command-center density without breaking the magazine style.

### Phase 5: Admin And Moderator

- Build admin dashboard, users, reports, news management, sources, forum, settings.
- Build moderator dashboard and reports.
- Use denser operational layouts, but keep the same tokens and shell.

Done when:

- Admin/moderator flows are usable and visually connected to the public app.
- Tables, charts, and status blocks are responsive.

### Phase 6: QA And Polish

- Check mobile, tablet, and desktop.
- Check text overflow, image behavior, focus states, contrast, loading, empty, and error states.
- Run typecheck/build.

Done when:

- All routes render.
- No obvious layout overlap.
- Typecheck/build passes or failures are documented.

## Decision Log

- Scope: rebuild all existing frontend routes.
- Reset strategy: delete `frontend/src/`, keep project shell.
- Visual dominant: Editorial Football Magazine.
- Supporting visual layers: Command Center for data, Community Arena for social.
- Image strategy: real football images for hero/primary cards, placeholders for missing data.
- Dependency strategy: use existing Astryx, theme-neutral, Tailwind, and Next.js before adding anything.
