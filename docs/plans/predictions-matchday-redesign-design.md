# Predictions Matchday Redesign

## Understanding summary

- Redesign `/predictions` and fixture detail without changing the prediction workflow, navbar, or authoritative kickoff lock.
- Keep the current league, Matchday, Upcoming/Live/Results, personal record, fixture list, standings, and leaderboard capabilities.
- Treat the fixture list as the primary task; visual change is an editorial, soft Matchday Desk rather than a denser dashboard.
- Show only provider-backed data. Remove mock fixtures, mock standings, synthetic form marks, and default analytic values.
- Keep a compact Top 5 standings rail, while `All standings` opens a wide accessible panel containing the complete provider list.
- Separate detail tabs: Overview is factual match and user-prediction context; Analysis contains only provider-backed comparison data; Lineups stays a distinct source-backed tab.
- A closed fixture remains navigable for review; only prediction editing is locked.

## Assumptions and constraints

- The selected provider/key/tier must pass a pre-release capability check for table position, recent results, home/away record, H2H, venue, officials, availability, lineups, and odds. Unsupported fields remain explicitly unavailable; the UI must not promise they exist.
- A field missing for one fixture is an ordinary source-coverage state, never a reason to fabricate a value or hide unrelated real data.
- Existing live refresh and React Query caching remain bounded; opening the full-standings panel reuses the loaded standings response rather than issuing a second request. Server requests use a per-resource timeout and in-flight deduplication, never a request-triggered broad league sync.
- `AVAILABLE` is valid only within the documented resource/state freshness budget. Expired live fixture/status data is marked `PROVIDER_UNAVAILABLE`, not presented as current.
- Public provider match snapshots are separate from authenticated user picks and records. Personal data is authorized, `private, no-store`, and excluded from shared caches, public responses, and provider diagnostic logs.
- Every control remains keyboard reachable, has a visible focus state, and uses a 44-pixel minimum touch target. Light and Dark tokens remain the only visual colours.
- No new UI library, mock dataset, automated narrative, or scoring-rule change is introduced.

## Final design

### Matchday Desk overview

Use one compact control rail for league, Matchday, fixture-state tabs, and an explicitly labelled applied timezone. Authenticated users get a low-profile three-value record strip; anonymous users get no replacement dashboard card. Date groups and kickoff times use that same timezone. Date-grouped fixtures occupy the broad primary column. A fixture row has team identity, actual kickoff/live/result state, a concise personal-pick state, and a 44-pixel trailing action: arrow for a pending pick, score plus arrow for a saved pick, and a non-interactive lock visual for a closed match. Every row still opens detail. During Matchday changes, only the fixture column skeleton-loads while controls and loaded standings remain visible; an `aria-live` update announces the count, empty state, or error. Live refresh never scrolls, moves focus, or replaces the reader's current context.

The supporting rail contains a compact Top 5 table and leaderboard only. `All standings` opens a labelled wide desktop dialog and a full-height mobile bottom sheet. It moves initial focus inside, traps focus, offers Escape and an explicit close control, restores focus to `All standings`, and preserves page scroll. On a 375px sheet the complete table scrolls horizontally with sticky rank/team columns and a visible remaining-columns cue; no statistics are cut or hidden. The complete table uses the same provider response and supports P, W, D, L, GD, and Pts without truncating or inventing rows.

### Fixture detail

A quiet match hero contains teams, actual score/status, Matchday, and provider-backed match metadata. The personal prediction card remains sticky on desktop and moves below the hero on mobile. In locked state it becomes a review card and keeps its link to the match detail.

Overview is limited to factual match state, available events/metadata, and the user's prediction/scoring state. It never renders the analysis widgets. Analysis is a set of independently available provider-backed sections: league position, recent form, home/away record, H2H, venue/officials, availability, and odds. If every section lacks coverage, one clear `Analysis unavailable` state replaces a wall of error cards. For partial coverage, microcopy distinguishes `No data published`, `Not covered`, and `Temporarily unavailable`; only the last state offers retry. Lineups show only published provider players and preserve explicit coverage states. Analytical model output is permitted only when both teams have at least five completed provider-sourced matches; it states the exact matches used and latest source update, and never falls back to a league prior, deterministic scoreline, trend, or generated form.

### Data contract and failure behaviour

Replace mock/fallback payloads and generated form marks with explicit availability states. A single canonical section-availability schema at the service boundary defines `AVAILABLE`, `NO_DATA`, `PROVIDER_UNAVAILABLE`, and `UNSUPPORTED`, with provider name, season, `fetchedAt`, and `sourceUpdatedAt` where known; contract tests validate it. Provider-specific mapping and default removal stay in the provider adapter so Java, Python, and frontend cannot reinterpret nulls or enum meanings. Nullable analysis fields remain null; backend must not substitute zeroes, empty teams, or generated W/D/L. Upstream failure is propagated as an unavailable state (and 5xx where the whole requested resource is unavailable), never HTTP 200 mock content. Public envelopes expose only stable reason codes and safe provenance; upstream URLs, bodies, secrets, stack traces, and internal exception text stay in server-side correlation-ID logs. The UI renders only source-backed sections, names an outage and no-data state distinctly, and permits a user-triggered retry only after the prior request completes, honoring server `Retry-After`/backoff.

Fixture detail uses a real provider fixture previously listed for the selected league/Matchday as its source of truth. If its local row is absent or stale, the backend performs one bounded synchronization for that known fixture; arbitrary fixture IDs remain rejected. Existing real fixture data, exact kickoff validation, user picks, score reconciliation, and leaderboard calculations are retained.

### Interaction and authority rules

The fixture row is one semantic link. Its arrow, saved-pick, and non-interactive lock treatments are visual children of that link, not nested buttons. The accessible link name includes the teams, match state, and `View match`; a closed-row tooltip and focus text say `Predictions closed — view match`. Browser countdowns are advisory only. Pick fields expose saving, saved, and field-level error state and focus the first error. A server `PREDICTION_CLOSED` response preserves the entered values while it refetches fixture state, then replaces the form with locked review state.

## Decision log

| Decision | Alternatives considered | Rationale |
| --- | --- | --- |
| Retain the current product structure and redesign its visual hierarchy | Replace it with a live-score dashboard or a minimal list-only page | The user wants the same capability with a substantially better appearance. |
| Use the Editorial Matchday Desk | Live Scoreboard; Minimal Fixture List | Keeps fixtures central while providing soft, premium hierarchy. |
| Use Top 5 plus an All standings panel | Full standings squeezed into the rail; separate page; bottom-of-page table | Preserves enough room for fixtures and leaderboard while keeping every standing accessible. |
| Use an icon-only trailing action | Text `Make prediction` | Reduces row density; accessible labels and tooltips preserve clarity. |
| Closed rows stay openable | Disable or hide closed fixtures | Users need to review match detail and saved picks after kickoff. |
| Separate Overview and Analysis components/contracts | Reuse the same analytics block in both tabs; merge the tabs | Prevents duplicated content and gives each tab a clear purpose. |
| Never fabricate data | Mock/synthetic fallback; hide every data area when one source fails | Maintains trust while allowing partial real data to remain useful. |
| Typed source envelopes with provenance | Empty arrays/default zeroes; generic 200 mock response | Lets the UI distinguish no data, unsupported capability, and provider outage without guessing. |
| Allow analytic model output only with five real completed matches per team | League prior and deterministic fallback | Keeps derived insight traceable to sufficient real source history. |
| Make a closed-row lock visual part of the row link | Nested lock button | Preserves valid interactive semantics while keeping review navigation available. |
| Keep loading local to changing fixture content | Whole-page reload/spinner | Prevents loss of Matchday, standings, and reading context. |
| Collapse a wholly unavailable Analysis tab to one state | One failed card per unavailable section | Makes a provider-wide limitation understandable without noise. |

## Validation plan

- Provider outage, no-data, unsupported-capability, and partial-field tests must show explicit states and no mock/synthetic values; every source envelope must include provenance/season/timestamps where available.
- Contract tests cover the canonical availability schema, complete standings, nullable analysis sections, lineup coverage, safe failure messages, cache isolation, and closed prediction review.
- UI checks cover desktop, 375px mobile, Light/Dark, timezone-consistent date/times, local Matchday loading, `aria-live` announcements, keyboard navigation, focus, panel lifecycle, partial/full Analysis availability, pick save/error/lock behaviour, and opening a closed row.
- Regression tests retain exact-kickoff server locking, prediction save/edit semantics, scoring, and current URL/Matchday state; they also assert per-resource timeouts, deduplication, freshness expiry, and user-driven retry/backoff behaviour.

## Structured design review

### Skeptic / Challenger

| Objection | Resolution |
| --- | --- |
| Existing contracts turn provider failure into empty/default data, so the UI cannot tell an outage from no data. | Accepted. Introduce per-resource typed source envelopes with provenance, season, freshness, and explicit availability states. |
| Provider capability is assumed but current default configuration lacks much of the promised detail. | Accepted. Add a pre-release provider/key/tier capability check and preserve unsupported states rather than promise data. |
| The prediction engine still derives values from priors, deterministic trend/score, and seeded form. | Accepted. Remove all priors/seeds; retain a labelled model only when both teams have at least five real completed source matches. |
| Mock paths remain in fixtures, standings, rounds, and prediction payloads, often behind HTTP 200. | Accepted. Remove every mock failure path and propagate typed unavailable or resource-level 5xx states. |
| Detail starts from a DB fixture and can reject a real listed provider fixture. | Accepted. Bounded-sync a known listed provider fixture if its local row is absent/stale; reject arbitrary IDs. |
| A button inside the row link is invalid nested interaction. | Accepted. The row remains the sole link; arrow/lock are visual children with an expanded accessible link label. |
| Client time can contradict the server's kickoff lock. | Accepted. Treat client timing as advisory and refetch authoritative locked state after a server rejection. |
| Complete standings can still be misleading without season/source/freshness. | Accepted. Include provenance, season, and timestamps in its source envelope. |

### Constraint Guardian

| Objection | Resolution |
| --- | --- |
| Opening panels or changing tabs could fan out into duplicate provider requests or broad league synchronization. | Accepted. Reuse loaded standings, add per-resource timeout and in-flight deduplication, and prohibit request-triggered broad league sync; retry is user initiated and backoff-aware. |
| An `AVAILABLE` live response can become stale while still looking current. | Accepted. Define resource/state freshness budgets and return `PROVIDER_UNAVAILABLE` for expired live status data. |
| Shared caches can leak authenticated prediction data. | Accepted. Separate public snapshots from authorized personal responses and require `private, no-store` for the latter. |
| Error payloads can leak upstream diagnostics or secrets. | Accepted. Return only stable safe reason codes and provenance; retain detailed failure information only in correlation-ID server logs. |
| The standings panel needs complete dialog accessibility behaviour. | Accepted. Specify label, initial/trapped focus, Escape/close, focus restore, and scroll preservation. |
| Availability enums can drift across provider, backend, and frontend. | Accepted. Make the section envelope canonical at the service boundary, confine provider mapping to its adapter, and validate with contract tests. |

### User Advocate

| Objection | Resolution |
| --- | --- |
| A lock treatment can imply that the row itself cannot be opened. | Accepted. Use a non-interactive visual only and expose `Predictions closed — view match` in tooltip/focus text. |
| Matchday loading could blank useful context or disorient a keyboard user. | Accepted. Skeleton only the fixture column, keep controls/standings, announce result state, and never move focus or scroll during refresh. |
| Group dates and kickoff times can be contradictory across timezones. | Accepted. Tie both to the explicitly labelled applied timezone. |
| A completely unsupported Analysis tab would become noisy with repeated failure cards. | Accepted. Use one tab-level unavailable state for total absence and distinct source messages/retry only for temporary outages. |
| Full standings must stay usable on a narrow mobile sheet. | Accepted. Add horizontal scrolling, sticky rank/team, and a remaining-columns cue without hiding stats. |
| Prediction save/lock feedback and derived analysis confidence need clearer evidence. | Accepted. Add field-level save/error/focus behaviour, preserve submitted values through a lock response, and disclose exact history/sample/update in eligible analysis. |

### Integrator / Arbiter

- Skeptic: 8/8 objections resolved with explicit data, locking, fixture-sync, and accessibility rules.
- Constraint Guardian: 6/6 objections resolved with cache isolation, freshness, safe failures, request bounds, and dialog requirements.
- User Advocate: 6/6 objections resolved with clear locked-row navigation, stable loading, timezone consistency, mobile standings, and evidence feedback.
- **Verdict: APPROVED.** No unresolved contradiction or new feature scope remains; the validation plan covers each resolution.
