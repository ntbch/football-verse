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
| Predictions uses a scan-first overview with a dedicated fixture page | Expanding a fixture in the list; large fixture cards; a control-room layout | Keeps routine score prediction fast while making analysis and lineups available without crowding the list. |
| Predictions lock exactly at kickoff | Lock early; allow a grace period | Matches the agreed rule and is already enforced by the backend clock and fixture status. |
| Lineups use source-provided official data only | Predicted or placeholder lineups | Avoids presenting invented player data as fact. |
| Prediction state is explicit until scoring completes | Infer incorrect from `correct: false` | Prevents a finished fixture with delayed scoring from appearing as a lost prediction. |
| Fixture detail URLs use the provider fixture ID plus overview query state | Local database ID; transient client state | Handles fixtures not yet persisted locally and makes direct links, refresh, and browser back deterministic. |
| Fixture dates use the viewer's IANA timezone | Grouping by UTC; fixed site timezone | Keeps daily groups and countdowns consistent with the user's locale. |
| Shared fixture data and private prediction state use separate cache paths | A single match-centre response cache | Prevents a user's pick, points, or action state from leaking through a shared cache. |
| Submission locks at `kickoff <= serverNow` in one transaction | Client countdown; a pre-read status check | Makes the exact-kickoff rule authoritative under reschedules and concurrent saves. |
| Detail contracts use explicit states and timestamps | Nullable fields and inferred booleans | Lets the UI distinguish pending scoring, unsupported data, temporary outages, and stale source data. |
| A missing pick is an explicit prediction affordance | Passive `not predicted` status | Makes completing a full Matchday fast without changing the dedicated-detail flow. |
| Detail return restores the originating fixture focus and position | Query preservation only; a generic back link | Prevents users from losing their place in a long fixture list. |

## Design

### Shared visual foundation

Use semantic CSS tokens for body, surfaces, primary and muted text, border, accent, and status colours. A theme value on the document root supplies Light and Dark token sets. Existing shared card, button, form, navbar, and page-shell styles consume tokens rather than fixed colours. A small guarded pre-hydration script reads only the `light` or `dark` local value, catches unavailable/corrupt storage, and sets the document attribute before first paint; Light remains the fallback. The React provider updates the same attribute without conditionally rendering markup. Expose an accessible theme control in the shared navbar and in the Career workspace/menu, so it remains reachable from every primary area at every breakpoint.

Public and community pages use editorial typography, clear content grids, restrained card treatments, and prominent story imagery. Career receives separate Career tokens within the same theme context, retaining a high-contrast pitch and matchday experience. Management pages inherit shared colours without a layout rewrite. The colour-alignment completion condition is that every visible management surface, text, border, action, and state colour resolves through a shared semantic token; fixed visual colours are removed or mapped to a token.

### Public navbar refinement

The public navbar is a single quiet floating surface, offset from the top edge and constrained to the same maximum width as the public content. It has a soft surface background, one subtle border, and a restrained shadow. The Football Verse wordmark remains unframed at the left. Desktop navigation remains centred and uses the existing five icons only; each icon has a 40 by 40 pixel target, an accessible name, and a tooltip on hover or keyboard focus. The active route is marked by a small accent-muted rounded surface with an accent icon. Inactive icons use secondary text and a subtle surface hover. Search, theme, management, notifications, and account controls remain on the right with their existing behavior and matching icon targets. Mobile retains the hamburger and drawer behavior. No new dependency, request, or navigation state is introduced. Respect reduced motion and retain visible focus states in both themes.

### Predictions match centre

The `/predictions` overview has no decorative masthead. A compact control bar contains league, Matchday, and Upcoming/Live/Results controls; Matchday remains available in every tab, including Results. It visibly states the applied timezone, for example `Times in Asia/Bangkok`; UTC fallback is also named. Authenticated users see a small, useful summary of points, accuracy, and upcoming fixtures in the selected Matchday that still need a prediction. Anonymous visitors instead see that sign-in is required to track a pick. Fixtures are grouped by the viewer's IANA timezone and rendered as full-row links with team identity, time/live/result state, and a clear personal-prediction outcome. For an unactioned fixture, the single row link has a visible `Make prediction` affordance and an accessible name that names the fixture; it is not merely passive `not predicted` text. A `correct: false` value alone never renders as incorrect before the backend declares scoring complete. Desktop keeps standings and leaderboard in a narrow supporting column; mobile moves them after fixtures. League and Matchday controls, tabs, and row actions retain visible labels, 44-pixel targets, standard tab semantics, and a keyboard-visible focus path.

Each fixture opens a dedicated detail route keyed by the stable provider fixture ID, with league, Matchday, tab, focus fixture, and validated viewer IANA timezone retained in the URL query. Browser back and the explicit return link restore that fixture's position and keyboard focus in the overview. An invalid timezone falls back to UTC and the response echoes the applied zone. The detail endpoint accepts only an allowed league and a fixture ID already present in that league's known feed before resolving or synchronizing the local fixture, so anonymous direct links cannot trigger arbitrary provider work and a listed fixture never relies on a transient `id: 0`. Its compact match header shows teams, kickoff/status, and score. The user prediction card follows immediately, with score input first, optional markets, an explicit save action, and a countdown labelled with the applied timezone before kickoff. Anonymous visitors receive a sign-in CTA that returns to this exact fixture. The client countdown is informative only: the submission transaction re-reads and locks the fixture, then rejects `kickoff <= serverNow` or any non-upcoming status. A `PREDICTION_CLOSED` response refetches fixture state and changes the card to closed. The prediction record uses an idempotent database upsert with unique-conflict recovery. Live and completed matches prioritize actual score; `Scoring pending` and `Points provisional — result may change` appear as plain text until the backend marks scoring complete and provider corrections are reconciled.

Public fixture, score, and lineup data are cached by `league:fixtureId`; authenticated prediction, points, and needs-prediction data are fetched separately and are never shared/CDN cached. Detail loads are coalesced per key, have a two-second provider deadline, and never synchronize on every overview/detail read. Freshness is fifteen minutes more than two hours before kickoff, sixty seconds from two hours before kickoff through live play, and fifteen minutes after completion; stale-if-error windows are two hours, five minutes, and twenty-four hours respectively. A source correction invalidates the affected fixture. The response exposes `sourceUpdatedAt`, `fetchedAt`, and whether the rendered data is stale; live score and lineup areas visibly say when last known data is being shown. Unsupported competitions and provider 4xx/429 responses are not retried; one bounded retry is allowed for transport or 5xx failure, and failures preserve known source data rather than overwriting it with empty values.

Below the primary prediction card, three tabs separate overview, lineups, and analysis. Overview contains the existing source-backed probabilities, form, and recommendation. Lineups display starting XI, substitutes, positions, source timestamp, and a typed coverage state: `PUBLISHED`, `AWAITING_OFFICIAL`, `UNSUPPORTED_COMPETITION`, or `PROVIDER_UNAVAILABLE`. Fixture status, prediction scoring state, and closure error are likewise typed enums; partial sections are explicitly nullable rather than inferred from `correct: false`. Analysis contains only source-backed metrics. A Matchday with no fixtures, an unavailable fixture, and a provider outage use different clear text and recovery actions, never the pick-status treatment. The backend adds fixture-detail and lineup data retrieval before the frontend surfaces the lineup tab; it returns the requested league rather than a hard-coded league label and permits partial rendering when an external call fails. It must not fabricate predicted players. No auto-save, community voting, or decorative page copy is introduced.

### Locale and translated News

The first phase supplies a `LocaleProvider` for `en`, UI dictionaries organised by feature, and translation helpers. Completion requires every frontend-controlled rendered string to use the dictionary; API content and canonical football entity names are excluded. The active locale is part of News query keys and requests. Requests must be abortable on a locale change, and the client accepts a response only when its echoed `requestedLocale` matches the active key.

The future ingestion workflow retains the English source and stores sanitized translated display title, summary, body, and display metadata keyed by article, locale, and source revision. Canonical IDs, source identity, publication state, original slug, and canonical URL are not translated in this phase. Jobs have an idempotency key for that tuple and may write only if the revision is still current. An article update invalidates and requeues translations; unpublish/delete hides or removes every translated rendition. News responses include both the requested and resolved locale. The selected locale must be represented in the request URL or `Vary` cache key so server/CDN caches cannot mix locales. If a translation is unavailable, show the same visible “English original — translation unavailable” notice on its News listing card and article reader. Translation jobs are retryable and never block English publication.

Before a non-English locale is enabled, set bounded launch limits for article volume, enabled locales, backfill window, retry volume, storage retention, queue concurrency, and provider spend. The translation provider must be approved for the content rights and any personal data that may appear in article text, with documented retention, processing-region, credential, and least-privilege access controls. These are activation gates, not requirements for the English-only UI phase.

When Japanese launches, introduce locale URLs such as `/en/news/...` and `/ja/news/...`, redirect legacy routes, and adopt an i18n library for robust locale formatting and route handling.

### Delivery and verification

Deliver in this order: shared tokens and theme control; public shell and pages; Career; management colour alignment; UI string extraction as each page is touched. Keep visual work separate from the future backend translation migration.

Verify production builds and existing tests, plus browser smoke coverage for persisted theme selection, absent/corrupt storage, and responsive shell behaviour. A system preference change must not override an explicit stored `light` or `dark` selection. When News locales are implemented, verify an abort/rapid locale switch, locale-aware server/CDN cache separation, echoed response locale, English fallback rendering, stale revision rejection, and update/unpublish/delete propagation. Preserve keyboard navigation, visible focus, sufficient contrast, reduced-motion support, and usable narrow-screen tables.

For Predictions, add contract tests for every fixture, scoring, lineup-coverage, and closure state; integration tests for kickoff equality, rescheduling between read and submit, concurrent submission, and pending-to-scored-to-rescored transitions. Test cache hit, expiry, stale-on-error, request coalescing, provider retry classification, and authentication/cache isolation so no user's pick can be returned to another user. Smoke-test direct detail links, preserved overview state, timezone fallback, the exact-kickoff closure state, and responsive keyboard flows.

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

## Predictions redesign review

### Skeptic / Challenger

| Objection | Resolution |
| --- | --- |
| Client time, fixture status, and a reschedule can conflict near kickoff. | Accepted. The client countdown is informational; the server validates the current kickoff and status on every save. A closure response refreshes the fixture and replaces the form with its authoritative state. |
| A finished fixture may be unscored, making `correct: false` ambiguous. | Accepted. Add an explicit prediction-scoring state and render `pending scoring` until the backend declares completion; correction reconciliation keeps points provisional. |
| Official lineups, provider outages, and unsupported leagues are indistinguishable. | Accepted. Detail data provides a source timestamp and one of four coverage states: published, awaiting official lineups, unavailable for competition, or provider temporarily unavailable. |
| A provider fixture can have no local ID; transient overview filters disappear after refresh. | Accepted. Detail uses provider fixture ID and URL query state. The server resolves/synchronizes the local fixture before prediction submission. |
| UTC grouping, a hard-coded league label, and unbounded external requests can produce wrong or fragile UI. | Accepted. Group dates in the viewer's IANA timezone, echo the requested league, fetch details only on demand, cache them with bounded freshness, and allow source-backed sections to fail independently. |
| Anonymous visitors and the “needs prediction” summary are ambiguous. | Accepted. Anonymous visitors receive an explicit sign-in state; the count is only unactioned upcoming fixtures in the selected Matchday. |

### Constraint Guardian

| Objection | Resolution |
| --- | --- |
| Repeated overview/detail reads can amplify provider traffic. | Accepted. Cache public fixture data by `league:fixtureId`, coalesce concurrent loads, use a two-second deadline and state-aware freshness/stale windows, and never synchronize on every read. |
| Shared caching can leak personal predictions or points. | Accepted. User-specific state uses a separate authenticated, non-shared cache path. |
| Direct links can force arbitrary provider work; pre-read closure checks race. | Accepted. Validate allowed league and known fixture before external work. Submission re-reads and locks the local fixture in one transaction, uses `kickoff <= serverNow`, and recovers a unique upsert conflict. |
| Nullable/magic fields hide failure and freshness states. | Accepted. Define typed fixture, scoring, lineup-coverage, and closure states plus `sourceUpdatedAt`, `fetchedAt`, and explicit partial sections. |
| Retry, stale, correction, and timezone behaviours were not bounded. | Accepted. Use stated retry classification and state-aware windows, invalidate on correction, expose freshness, validate/echo the display timezone, and fall back to UTC. |
| The design had no verification plan for races, cache, or isolation. | Accepted. Add the contract, integration, cache, and auth-isolation checks specified in Delivery and verification. |

### User Advocate

| Objection | Resolution |
| --- | --- |
| A passive `not predicted` state forces extra hunting when users want to complete several picks. | Accepted. The existing single row link receives a visible `Make prediction` affordance and a fixture-specific accessible name. |
| URL state does not restore a user's place after visiting detail. | Accepted. Retain the origin fixture in the URL and restore scroll position and keyboard focus on return. |
| Local timezone and stale data are invisible, undermining trust. | Accepted. Name the applied timezone in the overview and countdown; show last-known/freshness text beside live score and lineups. |
| Empty, unavailable, and outage states can look like an unfinished pick. | Accepted. Give each a distinct plain-language state and recovery action. |
| Anonymous visitors have no direct continuation from detail. | Accepted. The prediction card supplies a login CTA that returns to the exact fixture. |
| Mobile and keyboard behavior was too vague; pending scoring could be misunderstood. | Accepted. Specify 44-pixel labelled controls, standard tab and focus behavior, and explicit `Scoring pending` / provisional-points text. |

### Integrator / Arbiter

**Disposition: APPROVED.** The Understanding Lock is confirmed. All six Skeptic / Challenger, six Constraint Guardian, and six User Advocate objections are accepted and resolved in the Decisions, Predictions match centre, and Delivery and verification sections. No objection is open or rejected.
