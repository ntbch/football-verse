# Public Web Matchday Editorial Design

**Status:** Approved for implementation planning  
**Date:** 2026-07-28  
**Scope:** Public web, authenticated user pages, Matches, Predictions, Forum, Search, and admin/moderator shells. Career mode is excluded.

## Understanding Summary

- Refresh the entire web experience except Career mode; preserve existing routes, features, APIs, and business rules.
- Use a hybrid **Matchday Editorial** direction: premium football newsroom first, sports-app pacing second, community participation third.
- The home page leads with the latest real news and real community discussion.
- Success balances visual credibility, faster content scanning, and stronger discussion participation.
- Support deliberate light and dark modes across the public product.
- Mobile prioritizes reading, following discussions, and routine actions; complex authoring can be vertically simplified.
- The product must never present invented articles, scores, comments, standings, people, or activity as real content.

## Assumptions and Non-Goals

- Keep the existing Next.js, React, Tailwind, TanStack Query, and API contracts. Do not introduce a UI kit for this work.
- The theme preference is stored locally and initially respects `prefers-color-scheme`; the public document sets the browser `color-scheme` before paint to avoid a theme flash.
- Existing loading, error, empty, authorization, and realtime behavior remains authoritative; the redesign can improve presentation only.
- A small team maintains the product, so shared components are created only after a second real use proves their shape.
- Every user-operated control has a 44px minimum touch target on mobile; dense desktop controls may look compact only when their actual hit area remains 44px. Visible focus is mandatory, and color is never the sole status indicator.
- Career mode, Career navigation, and Career styling remain unchanged.
- This work does not add fake content, analytics dashboards, new social features, new backend data, or rewrite business workflows.

## Selected Direction

### Matchday Editorial

The public product reads like a quality football publication with the pace of a live sports product. Editorial hierarchy makes headlines and long-form content readable; concise real-time surfaces make fixtures, predictions, and results discoverable; the forum turns readership into participation.

The application has one coherent visual language, but each workflow keeps the layout best suited to it. News should not become a grid of identical cards. Data-heavy screens should not imitate magazine layouts. Forum should optimize scanning and participation rather than decoration.

Alternatives rejected:

- **Live Hub:** strong for scores and data, but it weakens news reading and community identity.
- **Clubhouse Journal:** strong editorial/community experience, but insufficient sports-app pace.

## Visual Foundation and Global Shell

- Replace the current broad use of rounded cards and pill controls with purposeful grouping. Cards represent a summary or a bounded concept; lists and feeds stay visually light.
- Use editorial display typography for feature headlines and article reading, with a compact sans-serif for navigation, metadata, tables, controls, and status.
- Light mode uses a calm neutral surface, near-black text, and restrained football-red emphasis. Dark mode uses layered charcoal/deep-pitch surfaces with equal hierarchy and contrast, not an automatic color inversion.
- The shared public header is sticky and compact: brand, News, Matches, Predictions, Community, search, and account controls. The active destination has a clear text-and-shape indicator. It must preserve current links, authorization checks, search submission, notification behavior, and client query timing.
- Mobile keeps authenticated notifications visible beside the menu control and exposes a labelled drawer with the same information architecture and a visible search entry point. The drawer moves focus into itself, closes on Escape or its backdrop, prevents background interaction while open, and restores focus to its opener on close.
- Theme and public-shell changes apply to owned markup and UI controls only. Rich article HTML, third-party embeds, media, and existing charts retain their own rendering boundaries and must be contrast-checked in each theme rather than force-recolored.
- `PageHeader`, `SectionHeader`, `ContentCard`, `MetaRow`, and `StatusBadge` are candidates, not a prescribed component set. Start only with the theme/header foundation; extract a candidate after a second real use proves its shape.

## Content and Data Rules

All content visible to users comes from established APIs and state. The interface must not manufacture content to make a screen look populated.

- The home hero uses the newest published article returned by the existing news endpoint. It adds no client-side trust, language, image, freshness, or moderation rules; those stay server-owned. It is presented as the latest headline, never labelled “breaking” unless that status is returned by the API. If the endpoint has no article, the area becomes an explicit empty state.
- News streams use real title, source, date, image, and interaction data only.
- Match and prediction surfaces render only when the relevant real fixture, standing, or prediction data exists; otherwise they are absent or explain the unavailable data. Their absence never changes the order of the remaining Home sections.
- Community previews use real threads and category data. A genuinely empty community shows an authorization-aware invitation: a permitted signed-in user can create a discussion; a signed-out user is invited to sign in; an unauthorized user sees no impossible action. The primary news stream remains the stable Home anchor regardless of optional module availability.
- Skeletons reserve layout dimensions only. They never show fabricated names, outcomes, scorelines, counts, avatars, or headlines.
- Error states expose a local retry without replacing known good content elsewhere on the page.
- If the initial primary news request fails, Home shows one page-level error state with retry. Optional-module failures remain local only after the primary news stream has rendered.

## Screen-Level Layouts

### Home

- Lead with the latest real headline, followed by a compact editorial stream.
- Show match/prediction and community pulses only when their real data is available.
- Keep a desktop secondary rail for supplemental real content. Collapse to a single ordered column on mobile.

### News and Article

- News emphasizes source, publication time, and readable headlines. Filters and sorting are clear and compact.
- Article pages prioritize headline, source, time, media, readable body measure, and then the existing comment/discussion flow.
- Avoid repetitive card shells around every story; use dividers and spacing for feed rhythm.

### Forum and Profile

- On desktop, categories remain a contextual sidebar; on mobile, they become a compact selector above the thread feed.
- Thread rows prioritize title, category, activity, replies, and recent participation. Calls to create a thread remain available without obscuring the feed.
- Profile keeps activity and saved content scannable rather than decorative.

### Matches and Predictions

- Preserve data-first layouts and existing actions.
- Improve table and score hierarchy with clear labels, status treatments, and restrained highlights for the user’s own prediction.
- Wide data regions scroll horizontally inside their own container. The page canvas must not gain horizontal overflow from owned layout; long identifiers or third-party content use existing wrapping, truncation, or their own scroll boundary.

### Search, Admin, and Moderator

- Search presents a clear query state, grouped real results, and an actionable empty state.
- Admin and moderator retain their role navigation, labels, permissions, and authorization behavior. They inherit foundational colors, type, focus, and spacing only; role-specific workflow hierarchy and status contrast remain distinct and must not be flattened by the public theme.

## Responsive, Accessibility, and Reliability Requirements

- Verify layouts at 375px, 768px, 1024px, and 1440px.
- Mobile supports all reading, filtering, notification, and discussion-following flows. Long authoring/editing flows are vertically simplified, never hidden without explanation.
- Every user-operated mobile control has an accessible name, visible keyboard focus, and a 44px touch target. Desktop controls may appear compact only when their hit area remains 44px.
- Normal text meets 4.5:1 contrast. State includes text, icon, or shape in addition to color.
- Theme choice is available from account/mobile navigation, persists locally, and honors system preference for first-time users.
- Loading, error, and empty states represent real application state and maintain layout stability.

## Non-Functional Release Gates

- **Performance:** before and after each surface group, record three production-build runs on the same reference browser, viewport, network, and real-data environment. The median LCP and INP may not regress by more than 10%; CLS must remain at or below 0.1. The redesigned route may not issue more data requests than its current route merely to compose the interface.
- **Bounded rendering:** retain the current endpoint page/default limits. A redesign must not request a larger page or render an entire response solely to fill a visual region. Home keeps its existing 15-news-item read and four-thread preview; list, table, and search screens retain their established pagination/default response boundaries.
- **Reliability and rollout:** each surface group is independently releasable. `npm run build`, existing affected tests, and the acceptance evidence must pass before the next group starts. A changed route, authorization check, search/notification action, hydration error, or truthful-state failure blocks promotion; revert that surface group to the previous known-good implementation.
- **Security and privacy:** the redesign may not add `dangerouslySetInnerHTML`, broaden embed origins, expose new profile/role fields, or bypass current authorization, sanitization, or API-client paths. Existing rich-text, embed, auth, and role-security tests remain release gates for affected routes.
- **Repeatable theme verification:** the check set is one existing rendered example each of rich article content, allowed embed, chart, image, table, admin shell, and moderator shell. If an example is unavailable in the environment, verify the truthful unavailable state and record the missing example rather than substitute fake content.

## Acceptance Evidence

The redesign does not add product analytics or promise a quantitative engagement lift. It passes design acceptance when manual checks confirm the following with real API responses:

- At desktop and mobile widths, a current real headline and the first available real community discussion are discoverable without competing primary calls to action.
- A user can reach News, Matches, Predictions, Community, search, notifications, and account actions through the redesigned shell without changed route or authorization behavior.
- Every redesigned state has a truthful loading, empty, or error presentation; optional Home modules do not reorder the primary news stream.
- Light and dark modes pass contrast, focus, and legibility checks for owned UI and a representative rich article, embed, chart, image, table, and role shell.

## Implementation Boundaries and Order

Implement one surface group at a time while retaining the existing data contracts and actions:

1. Public theme tokens and shell, including light/dark mode.
2. Header and navigation.
3. Home, News, and Article.
4. Forum, Profile, and Search.
5. Matches and Predictions.
6. Admin and Moderator visual alignment.

Career mode is an explicit no-touch boundary. Each group should be visually checked against the four target viewports and its existing loading, error, and empty states before moving to the next group.

## Decision Log

| Decision | Alternatives considered | Rationale |
| --- | --- | --- |
| Scope is all web except Career | Redesign Career too; limit to one page | User explicitly excluded Career and wants the broader product improved. |
| Matchday Editorial visual direction | Live Hub; Clubhouse Journal | Best balance of premium news reading, sports pace, and community participation. |
| Home leads with news and discussion | Scores-first; prediction-first | User selected hot news and discussion as the main entry points. |
| Light and dark modes | Light-only; dark-only | User explicitly requested both. |
| Mobile prioritizes reading/following | Full desktop-density parity | Matches actual mobile needs while keeping routine actions available. |
| Keep functions/routes/API behavior | Feature redesign | User asked for a UI/experience refresh only. |
| No fake data | Seeded sample content; static metric placeholders | Protects user trust and reflects actual product state. |
| Progressive rollout | Big-bang rewrite | Limits regression risk and preserves existing behavior. |
| Hero eligibility follows the existing endpoint | Client-side “quality” rules | Avoids duplicating or silently changing server moderation/publishing policy. |
| Theme has owned-markup boundaries | Force recolor all rendered content | Prevents unreadable embeds, rich HTML, and charts while keeping them visibly verified. |
| Home optional modules do not change primary-feed order | Fill space with mock content; dynamically reorder sections | Keeps navigation and reading rhythm stable without inventing data. |
| Release evidence is manual and behavior-based | New analytics instrumentation; subjective sign-off only | Gives observable checks without expanding scope into product analytics. |
| 44px mobile hit targets are mandatory | “Where practical” exception | Avoids a touch-accessibility loophole while preserving dense desktop presentation. |
| Admin/moderator inherit foundations only | Fully unify public and role shells | Protects operational clarity, labels, and permission workflows. |
| Shared UI candidates are deferred | Build five primitives immediately | Keeps the small-team implementation YAGNI-compliant. |

## Structured Review Log

### Skeptic / Challenger — REVISED

| Objection | Resolution |
| --- | --- |
| Hero eligibility was undefined | Accepted: it now uses the newest published item from the existing endpoint, with server-owned qualification. |
| Shell/theme changes could alter behavior | Accepted: preservation of routes, authorization, search, notifications, and request timing is an explicit gate. |
| Theme boundaries and first paint were unclear | Accepted: owned-markup boundary, pre-paint `color-scheme`, and representative-content checks added. |
| Optional Home modules could destabilize reading order | Accepted: the news stream is a stable anchor and optional absence cannot reorder it. |
| Success and target-size requirements were untestable | Accepted: observable acceptance evidence and mandatory 44px hit targets added. |
| Role-shell, primitive, and horizontal-overflow rules were too broad | Accepted: role boundaries, deferred candidates, and owned-layout scroll boundaries made explicit. |

### Constraint Guardian — REVISED

| Objection | Resolution |
| --- | --- |
| No performance, release, or rollback limits | Accepted: production-build comparison, regression budget, promotion blockers, and surface-group rollback added. |
| Rendering could become unbounded | Accepted: existing endpoint page/default limits and Home counts are now hard boundaries. |
| Security/privacy verification was implicit | Accepted: no new HTML/embed/data exposure paths and existing security tests are release gates. |
| Theme review was not repeatable | Accepted: a fixed representative-content check set and unavailable-state rule added. |
| 44px wording conflicted | Accepted: the exception was removed. |

### User Advocate — REVISED

| Objection | Resolution |
| --- | --- |
| Newest article could be misleadingly called breaking | Accepted: it is now the “latest headline” unless the API supplies a breaking status. |
| Empty-community CTA could promise an unavailable action | Accepted: CTA is authorization-aware and offers only sign-in or permitted creation paths. |
| Mobile drawer lacked keyboard/focus behavior | Accepted: focus entry, background blocking, Escape/backdrop close, and focus restoration specified. |
| Mobile notification discovery was unclear | Accepted: authenticated notifications remain visible beside the drawer control. |
| Initial Home failure had no coherent state | Accepted: a failed primary news request produces one page-level retry state; later optional failures remain local. |

### Integrator / Arbiter — APPROVED

The Arbiter reviewed all Skeptic, Constraint Guardian, and User Advocate objections. All were accepted and resolved. One wording mismatch that called the newest article “breaking” was corrected; “breaking” is now reserved for an API-supplied status. No locked product decision was reopened.
