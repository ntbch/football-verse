# UI Redesign, Theme, and Internationalization Design

## Understanding summary

- Refresh the public and community product with an editorial football visual system.
- Keep Career visually distinct as a dense, game-manager workspace.
- Keep Admin and Moderator layouts; align them only through shared colours.
- Default to Light mode, with an accessible persistent Light/Dark control.
- Keep the product English-only now while making UI copy ready for translations.
- Serve translated News in the selected language once languages are enabled.
- Prioritize desktop while keeping primary screens usable on tablet and mobile.
- Preserve current workflows, permissions, and Career behaviour.

## Assumptions and constraints

- Theme and initial locale preferences are stored locally, not per account.
- Translation runs asynchronously during ingestion; English can publish if translation is delayed or fails.
- Translation data is kept by article and locale, with a safe English fallback.
- No user data is sent to a translation provider as part of this design.
- Existing React, Next.js, and Tailwind capabilities are sufficient for the first phase.
- The English-only UI phase does not call a translation provider. Before enabling another language, operations must set the article/day, locale-count, backlog, retry, storage-retention, and provider-budget limits for that launch.

## Decisions

| Decision | Alternatives considered | Reason |
| --- | --- | --- |
| Public/community visual direction is editorial football | Generic dashboard; game-manager everywhere | Supports news and discussion content without diluting Career. |
| Career uses a game-manager visual system | Reuse editorial components unchanged | Dense tables and match controls need a separate interaction vocabulary. |
| Admin/Moderator are colour-only | Full management redesign | Avoids unnecessary scope and preserves operational familiarity. |
| Light is the default, with persisted Dark mode | Dark default; no persistence | Matches the requested default without forcing a setting each visit. A guarded pre-hydration script applies the persisted value before paint. |
| Start with a local i18n foundation | Locale routes now; install an i18n library now | English is the only current locale, so the smaller path is enough. |
| News translation is stored at ingestion with English fallback | Per-read translation | Avoids repeated latency and cost and provides stable content. |
| Add locale URLs and an i18n library when Japanese launches | Keep local provider indefinitely | Japanese needs mature plural, date/time, and route-locale handling. |
| Translation activation is gated by operational and provider controls | Enable translation as soon as UI locale exists | Prevents unbounded queue cost and uncontrolled external processing. |
| Public navbar uses a quiet floating bar | Edge-to-edge header; transparent masthead; centre dock | Keeps the requested floating treatment without competing with page content. |
| Desktop navigation is icon-only | Persistent text labels; underline indicator | Avoids the heavy nested-pill look while tooltips and `aria-label`s preserve discoverability. |
| Active navigation uses an accent-muted icon surface | Underline; filled orange pill | Gives a soft, clear active state without visual noise. |

## Design

### Shared visual foundation

Use semantic CSS tokens for body, surfaces, primary and muted text, border, accent, and status colours. A theme value on the document root supplies Light and Dark token sets. Existing shared card, button, form, navbar, and page-shell styles consume tokens rather than fixed colours. A small guarded pre-hydration script reads only the `light` or `dark` local value, catches unavailable/corrupt storage, and sets the document attribute before first paint; Light remains the fallback. The React provider updates the same attribute without conditionally rendering markup. Expose an accessible theme control in the shared navbar and in the Career workspace/menu, so it remains reachable from every primary area at every breakpoint.

Public and community pages use editorial typography, clear content grids, restrained card treatments, and prominent story imagery. Career receives separate Career tokens within the same theme context, retaining a high-contrast pitch and matchday experience. Management pages inherit shared colours without a layout rewrite. The colour-alignment completion condition is that every visible management surface, text, border, action, and state colour resolves through a shared semantic token; fixed visual colours are removed or mapped to a token.

### Public navbar refinement

The public navbar is a single quiet floating surface, offset from the top edge and constrained to the same maximum width as the public content. It has a soft surface background, one subtle border, and a restrained shadow. The Football Verse wordmark remains unframed at the left. Desktop navigation remains centred and uses the existing five icons only; each icon has a 40 by 40 pixel target, an accessible name, and a tooltip on hover or keyboard focus. The active route is marked by a small accent-muted rounded surface with an accent icon. Inactive icons use secondary text and a subtle surface hover. Search, theme, management, notifications, and account controls remain on the right with their existing behavior and matching icon targets. Mobile retains the hamburger and drawer behavior. No new dependency, request, or navigation state is introduced. Respect reduced motion and retain visible focus states in both themes.

### Locale and translated News

The first phase supplies a `LocaleProvider` for `en`, UI dictionaries organised by feature, and translation helpers. Completion requires every frontend-controlled rendered string to use the dictionary; API content and canonical football entity names are excluded. The active locale is part of News query keys and requests. Requests must be abortable on a locale change, and the client accepts a response only when its echoed `requestedLocale` matches the active key.

The future ingestion workflow retains the English source and stores sanitized translated display title, summary, body, and display metadata keyed by article, locale, and source revision. Canonical IDs, source identity, publication state, original slug, and canonical URL are not translated in this phase. Jobs have an idempotency key for that tuple and may write only if the revision is still current. An article update invalidates and requeues translations; unpublish/delete hides or removes every translated rendition. News responses include both the requested and resolved locale. The selected locale must be represented in the request URL or `Vary` cache key so server/CDN caches cannot mix locales. If a translation is unavailable, show the same visible “English original — translation unavailable” notice on its News listing card and article reader. Translation jobs are retryable and never block English publication.

Before a non-English locale is enabled, set bounded launch limits for article volume, enabled locales, backfill window, retry volume, storage retention, queue concurrency, and provider spend. The translation provider must be approved for the content rights and any personal data that may appear in article text, with documented retention, processing-region, credential, and least-privilege access controls. These are activation gates, not requirements for the English-only UI phase.

When Japanese launches, introduce locale URLs such as `/en/news/...` and `/ja/news/...`, redirect legacy routes, and adopt an i18n library for robust locale formatting and route handling.

### Delivery and verification

Deliver in this order: shared tokens and theme control; public shell and pages; Career; management colour alignment; UI string extraction as each page is touched. Keep visual work separate from the future backend translation migration.

Verify production builds and existing tests, plus browser smoke coverage for persisted theme selection, absent/corrupt storage, and responsive shell behaviour. A system preference change must not override an explicit stored `light` or `dark` selection. When News locales are implemented, verify an abort/rapid locale switch, locale-aware server/CDN cache separation, echoed response locale, English fallback rendering, stale revision rejection, and update/unpublish/delete propagation. Preserve keyboard navigation, visible focus, sufficient contrast, reduced-motion support, and usable narrow-screen tables.

## Non-goals

- No behaviour, authorization, or Career data-model changes in the visual redesign.
- No automatic translation of user-generated content or external team names.
- No locale URLs, non-English UI, translation-provider selection, or i18n dependency in the first English-only phase.

## Structured design review

### Skeptic / Challenger

| Objection | Resolution |
| --- | --- |
| Persisted Dark mode could flash Light or hydrate inconsistently. | Accepted. Use a guarded pre-hydration attribute script and keep React markup theme-independent. |
| Locale-aware browser cache keys do not protect server/CDN caches. | Accepted. Require locale in the request URL or cache `Vary` policy. |
| An older News response can render after a locale switch. | Accepted. Abort obsolete requests and validate the echoed requested locale. |
| “Metadata” could accidentally include canonical SEO/routing fields. | Accepted. Translate display metadata only; preserve canonical source identity, slug, URL, and publication state. |
| Incremental extraction could leave permanent hard-coded strings. | Accepted. Define a completion condition requiring every frontend-controlled string to use a dictionary. |
| Admin/Moderator colour alignment lacks a measurable outcome. | Accepted. Require all visible colours to resolve through semantic tokens. |
| Theme and fallback smoke coverage omits failure paths. | Accepted. Add storage, system-preference, rapid locale-switch, and cache-separation cases. |

### Constraint Guardian

| Objection | Resolution |
| --- | --- |
| Retries can write stale or duplicate translations. | Accepted. Key work and storage by article, locale, and source revision; allow writes only for the current revision and define update/unpublish/delete behaviour. |
| Translation cost and capacity are unbounded. | Accepted. Keep the English-only phase provider-free and require explicit launch limits, queue controls, retention, and spend budget before enabling a locale. |
| Provider privacy and content-rights controls are unspecified. | Accepted. Make provider approval, retention/region terms, credential boundaries, and least privilege activation gates. |
| System-preference test conflicts with explicit Light/Dark-only state. | Accepted. Verify that a system change does not override an explicit persisted choice. |

### User Advocate

| Objection | Resolution |
| --- | --- |
| A selected-locale reader can mistake fallback English for a translation. | Accepted. Show the same explicit English-original notice on both listing cards and the reader. |
| Career users may have no route to the navbar theme control. | Accepted. Provide the persistent control inside the Career workspace/menu at every breakpoint. |

### Integrator / Arbiter

**Disposition: APPROVED.** The Understanding Lock is confirmed; every Skeptic, Constraint Guardian, and User Advocate objection is accepted with a testable resolution above. No material objection or unlocked decision remains. The operational/provider limits are explicit activation gates for a future non-English rollout and do not block the current English-only UI implementation.
