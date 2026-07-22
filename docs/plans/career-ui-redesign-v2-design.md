# Career UI Redesign V2

**Status:** Approved after structured review  
**Date:** 2026-07-21  
**Scope:** Career shell, all eight Career tabs, and paginated/searchable list APIs

## Understanding Summary

- Redesign all eight Career tabs as a professional Football Manager-style workspace.
- Use balanced density: minimize scrolling while retaining comfortable reading and clear hierarchy.
- Keep eight primary tabs and introduce sub-tabs only where a screen contains distinct workflows.
- Prioritize desktop and laptop viewports from 1024px; mobile supports viewing and basic actions.
- Open player, fixture, club and transfer details in a contextual right-side panel.
- Support future multi-league saves with thousands of players through server pagination, search, filtering and sorting.
- Preserve existing Career gameplay and business behavior while improving navigation, information architecture and presentation.

## Assumptions and Non-Goals

- Existing authentication remains authoritative; every Career query and mutation verifies save ownership server-side.
- There is no hard response-time SLA. Common interactions should feel immediate, while slower requests expose stable loading feedback.
- The Career UI is maintained by one developer or a small team.
- Existing React, Next.js, TanStack Query and CSS remain the default stack. Add a dependency only when measured need justifies it.
- English remains the UI language for this redesign.
- This redesign does not change match rules, Career simulation, transfer logic, squad calculations or manager behavior.
- No new realtime transport, free-form dashboard builder, speculative charts, shortlist model, set-piece system or honours data is included.

## Existing Behavior Inventory

| Tab | Existing reads | Existing mutations/interaction that must remain |
|---|---|---|
| Portal | save, fixtures, standings, manager, active match session | advance day, next season, resume match, rename/delete save, training focus |
| Fixtures | season fixtures and statuses | open the due fixture through the existing Matchday flow |
| Squad | managed squad, player analysis, player stats | inspect, compare, list a player for transfer |
| Tactics | saved lineup, formation, roles/duties, instructions, match squad | remap formation preview, edit/save tactics, start/resume Matchday |
| Transfers | market, scouting knowledge, offers, budget/window | scout, bid, offer terms, complete transfer |
| Table | standings and player season stats | sort/filter presentation only |
| Manager | profile, pressure, objectives, decisions, jobs | accept an available job |
| History | completed season summaries | read-only |

The redesign may reorganize these behaviors but cannot invent data or change server-authoritative action validity.

## Design Direction

Use a **Contextual Command Center**: each tab receives a layout suited to its workflow, while shared shell and interaction primitives keep navigation predictable. Portal may be visually expressive; specialist tabs prioritize data, comparison and fast action.

Cards are reserved for summaries and grouped concepts. Large datasets use tables, position lanes or timelines rather than repeated decorative cards. Status is communicated with text and shape in addition to color.

## Global Shell

- Desktop icon rail: 64px wide, one-click access to all primary tabs.
- Every rail icon exposes its label on hover and keyboard focus; the active destination has `aria-current`, an accent edge and persistent high-contrast state. The context-bar heading repeats the active destination name.
- Mobile navigation: dismissible drawer with visible labels.
- Context bar: 56px high, containing screen title, game date, next opponent and at most one primary action.
- Toolbar and filters live inside the active tab, not in the global context bar.
- Content canvas owns the remaining viewport width and adapts its layout per tab.
- Detail panel: non-modal right sheet at 1024px and wider; bottom sheet below 1024px. It never changes the content column width at a one-pixel breakpoint.
- Tab, sub-tab, committed filter, sort, page and selected-detail state are represented in the URL. Unsubmitted form text and tactical drafts remain local state.

## Information Architecture

| Primary tab | Sub-tabs | Primary presentation |
|---|---|---|
| Portal | None | Command dashboard |
| Fixtures | Schedule, Results | Matchday-grouped list |
| Squad | List, Depth, Compare | Table, position lanes, comparison matrix |
| Tactics | Starting XI, Instructions, Match Squad | Pitch and focused editors |
| Transfers | Market, Negotiations | Search table and deal timeline |
| Table | Standings, Player Stats | Dense sortable tables |
| Manager | Profile, Board, Decisions, Jobs | Contextual dashboards and activity lists |
| History | None initially | Season timeline |

## Tab Designs

### Portal

- A compact action strip shows the next required decision, opponent context and one primary CTA.
- Portal suppresses the context-bar CTA; its action strip is the single primary action owner.
- The lower grid gives Calendar two-thirds width and Club Status/Board Pressure one-third width.
- Portal previews information instead of duplicating full specialist screens.
- Career Settings moves to a secondary menu and does not occupy permanent dashboard space.

### Fixtures

- Schedule and Results separate future planning from completed-match review.
- Filters cover season, competition, home/away and opponent search.
- Fixtures are grouped by matchday; the managed club is emphasized with an accent edge and a text label.
- Selecting a fixture opens contextual details and exposes Matchday only when the fixture state allows it.
- Fixtures are not paginated: a managed club season is bounded and matchday groups must remain intact.

### Squad

- A KPI strip shows squad size, average age, unavailable players and wage usage when available.
- List uses a sortable table with sticky headers and responsive column priorities.
- Depth uses positional lanes with explicit primary/secondary familiarity.
- Compare pins two players above a vertically scrollable attribute matrix.
- Selecting a player opens the shared inspector without losing filters or scroll position.
- Compare treats missing attributes as “Not available”, never zero, and always shows each value's unit/scale.

### Tactics

- Starting XI gives approximately 65% of desktop width to the pitch.
- Formation selection stays in the local toolbar.
- Instructions and Match Squad move into dedicated sub-tabs to avoid crowding the pitch.
- Save and Matchday actions use a sticky bottom action bar.
- Draft and saved states have text labels and icons; leaving with an unsaved draft requires confirmation.
- Dirty state is computed against one canonical saved `TacticalSetup` across all three sub-tabs. Failed saves retain the draft and error context.
- Moving between Starting XI, Instructions and Match Squad never prompts and never discards the shared draft. Confirmation appears only when leaving the Tactics workflow, changing Career or unloading the page.

### Transfers

- A KPI strip shows transfer budget, wage budget, window state and active-deal count.
- Market supports server-side position, age, club, value and scouting filters.
- Player selection opens recruitment detail with known information and Scout/Bid actions.
- Negotiations presents each deal as a state timeline with the next valid action clearly positioned.

### Table

- Standings uses one sticky-header table and marks the managed club with an accent and “You” label.
- Player Stats supports competition, club and position filters plus server-side sorting.
- Mobile keeps the identity column sticky while statistical columns scroll horizontally.

### Manager

- Profile presents identity, record and an attribute matrix.
- Board presents confidence, pressure and objectives with explicit progress.
- Decisions is a filterable activity log.
- Jobs lists opportunities and uses the detail panel for club comparison and acceptance context.

### History

- Completed seasons appear on a chronological timeline.
- Each record shows only data currently owned by the backend.
- Seasons/Honours sub-tabs are deferred until distinct honours data exists.

## API and Data Contract

Only unbounded lists—transfer market, negotiations, player statistics and future cross-league player search—use a paginated contract. Fixtures, the managed squad, standings, objectives and season history remain bounded reads.

```text
GET ...?page=0&size=50&sort=name,asc&q=term&filters...

{
  "items": [],
  "page": 0,
  "size": 50,
  "totalItems": 0,
  "totalPages": 0,
  "dataVersion": 0
}
```

- The server caps page size at 100 and validates allowed sort/filter fields.
- Every sort appends a stable immutable-ID tie-breaker. Out-of-range pages return an empty `items` list with valid totals.
- Ownership predicates are applied before search, filtering and aggregation.
- Search trims whitespace and performs case-insensitive, Unicode accent-sensitive substring matching after at least two characters. A one-character query shows “Type 1 more character” without firing a request; clearing search immediately removes `q`, resets page zero and restores the unfiltered list. PostgreSQL trigram indexes support searched name fields; numeric ranges use stored integer currency values; Career dates remain ISO local dates without timezone conversion.
- Search input is debounced by 250ms; superseded requests are cancelled through an actual `AbortSignal` propagated by the HTTP client.
- Server pagination is the initial scaling mechanism. Virtualization is deferred until measured rendering cost justifies it.
- TanStack Query keeps the previous page visible during transitions and caches queries by authenticated principal, save, sub-tab, canonical filters, sort and page. Logout, principal change, save deletion or ownership `403` removes the full Career cache before another screen can render it.
- A Career-owned `dataVersion` increments with simulation and relevant mutations. Subsequent page requests carry the expected version; a mismatch returns a dataset-changed conflict, resets the journey to page zero and explains the refresh instead of silently mixing versions.
- A mutation invalidates affected list, KPI and detail keys together; page resets to zero when a filter changes or when the current page becomes empty.
- One shared parser/serializer removes default values, sorts filter keys, normalizes enums/numbers and produces both URL search params and TanStack query-key input. Invalid URL values fall back to canonical defaults and replace the URL once.

Non-idempotent mutations—advance day, next season, accept job, complete transfer and equivalent state transitions—carry a client-generated request ID persisted by the server with the original outcome. Automatic mutation retry is disabled. After an ambiguous network failure, the client refetches authoritative state and either reports the committed result or retries with the same request ID.

## Shared Components and Ownership

Start with `CareerShell`, `ContextBar`, `SubTabs` and `DetailPanel`, which already repeat across the approved layouts. Extract FilterBar, DataTable or KpiStrip only after a second real use proves a stable interface. Each tab owns its workflow layout, query composition and empty-state language.

`DetailPanel` owns URL selection, responsive presentation, Escape handling and fallback focus. Existing inspectors, including `PlayerInspector`, render as panel content and never create a nested modal or second routing state. Business mutations continue through the existing Career API hooks.

## Reliability and Error Handling

- Loading skeletons reserve the dimensions of the region being loaded.
- A failed KPI, table or panel exposes local retry without blanking the rest of the tab.
- Empty states distinguish no data, no search results and unavailable features.
- URL state enables refresh, sharing and browser back/forward recovery.
- Tactics uses an explicit dirty state and guards tab changes, Career exit and browser unload. Tab-button navigation updates the URL only after confirmation. A cancelled browser `popstate` restores the prior URL with a one-shot suppression flag to avoid a confirmation loop.
- Closing a panel restores focus to the originating control only if it still exists. Deep links or removed rows fall back to the active screen heading without forcing a stale page/filter.
- Stale paginated requests cannot replace newer filter results.
- Server rejection of a stale action leaves the user's inputs intact, refreshes affected reads and explains the new authoritative state next to the action.
- Failed mutations never optimistically claim completion. Buttons leave pending state, local drafts remain, and the relevant panel/row exposes retry or correction guidance.

## Responsive and Accessibility Requirements

- Validate layouts at 375, 768, 1024 and 1440px.
- Interactive targets are at least 44px; keyboard focus is always visible.
- Tables provide semantic headings and accessible names for sorting controls.
- Status never relies on color alone; normal text meets 4.5:1 contrast.
- Desktop right sheets are non-modal and do not trap focus, allowing rapid list comparison. Mobile bottom sheets are modal, trap focus, close with Escape and return focus when an opener exists.
- Wide tables scroll within their container rather than the whole page.
- Motion uses transform/opacity for 150–200ms and respects `prefers-reduced-motion`.
- The context bar owns sticky layer 20, table headers 10, desktop sheet 30, navigation drawer/backdrop 40/35 and blocking dialogs 50. Each tab has one vertical scroll owner; horizontal table scroll remains inside its data region.

Mobile scope intentionally does not provide full functional parity. It supports all reads, filters, pagination, detail inspection, Advance/Next Season, Resume Matchday and Scout. Tactics editing, transfer bids/terms/completion, job acceptance and save rename/delete remain desktop workflows; mobile shows their current state and an explicit “Continue on desktop” explanation rather than hiding controls. Existing Matchday remains a separate responsive surface.

Balanced density passes when a 1440×900 viewport shows the context bar, local toolbar and at least ten standard table rows without page-level horizontal scrolling. Portal shows the primary action and next fixture without vertical scrolling. Loading feedback appears within the next render frame; server latency is reported but has no hard pass/fail SLA.

There is no absolute response-time SLA. Representative data contains 50,000 players, 100 clubs, active offers and multi-season stats; benchmark p50/p95 is recorded and a change cannot regress the approved indexed baseline by more than 20% or introduce N+1 queries. Migration review includes `EXPLAIN ANALYZE`, trigram/range index verification and bounded response-size checks. Client performance checks use the same regression rule for a 50-row render and panel open on the reference desktop profile.

## Verification Strategy

- API integration tests cover ownership, invalid filters, page bounds, sorting and stable totals.
- Security lifecycle tests prove that logout, account switch, save deletion and ownership loss cannot display prior Career cache data.
- Idempotency tests cover lost-response retries for advance day, next season, job acceptance and transfer completion.
- Scale tests use the representative 50,000-player dataset and verify query count, indexes, p95 and bounded response size.
- UI tests cover URL state, back/forward behavior, filter reset, pagination and empty/error states.
- Interaction tests cover deep-linked/removed-opener panel focus, non-modal desktop behavior and modal mobile behavior.
- Dirty-state tests cover tab clicks, Career exit, browser back/forward, invalid formations and failed saves.
- Mutable-data tests cover a page becoming empty, fixture status changes, stale action rejection and coordinated invalidation after every Career mutation.
- Responsive checks cover all target viewport widths with no page-level horizontal overflow.
- Existing Career mutation, Matchday and tactics tests remain release gates.

## Decision Log

| Decision | Alternatives considered | Rationale |
|---|---|---|
| Football Manager visual direction | EA FC cinematic; hybrid | The user prioritized professional data workflows. |
| Balanced density | Maximum density; spacious cards | Reduces scrolling without sacrificing readability. |
| Eight tabs plus selective sub-tabs | Keep flat tabs; consolidate to five hubs | Preserves familiar navigation while separating complex workflows. |
| Desktop/laptop from 1024px | Full mobile parity; 1440px-only | Matches the management workflow while retaining basic mobile access. |
| Contextual right detail panel | Modal; inline row expansion | Preserves list context and supports rapid comparison. |
| Contextual Command Center | Modular uniform workspace; spreadsheet-first | Gives each football workflow an appropriate presentation. |
| Server pagination and search | UI-only redesign; deferred API contract | Required for multi-league saves with thousands of players. |
| URL-owned navigation state | Tab-only persistence; reset on refresh | Provides reliable refresh, sharing and browser navigation. |
| No hard performance SLA | 300ms; one-second SLA | The user declined a fixed target; stable feedback remains mandatory. |
| Selective dependencies | No dependencies; component library | Keeps maintenance low while permitting measured optimization. |
| Small-team ownership | Multi-team architecture | Favors few shared primitives and tab-local workflow code. |
| Defer virtualization | Add virtualization immediately | Server pages of 50 rows avoid speculative complexity. |

## Structured Review Log

### Skeptic / Challenger — REVISE

| Objection | Resolution |
|---|---|
| Missing review evidence and behavior baseline | Accepted: status changed to In structured review; existing behavior inventory added. |
| Pagination could duplicate/omit mutable data | Accepted in part: stable ID tie-breakers and coordinated invalidation added; snapshot pagination rejected because Career lists are eventually consistent, not financial records. |
| Matchday groups conflict with pagination | Accepted: fixtures remain an unpaginated bounded season read. |
| URL navigation conflicts with dirty tactics | Accepted: confirm-before-push and guarded popstate rollback are specified and tested. |
| Focus restoration is impossible for deep links/removed rows | Accepted: screen-heading fallback replaces the invalid invariant. |
| DetailPanel and PlayerInspector ownership overlap | Accepted: panel owns shell/routing; inspector is content only. |
| Three panel modalities and breakpoint discontinuity | Accepted: reduced to desktop right sheet and mobile bottom sheet. |
| Mobile action scope was undefined | Accepted: explicit supported behavior added; capabilities are not silently removed. |
| Filter semantics, invalidation and mutation failures were undefined | Accepted: semantics, invalidation groups and failure behavior added. |
| Focus trap harms desktop comparison | Accepted: desktop sheet is non-modal; only mobile sheet traps focus. |
| Dirty baseline and compare missing-data semantics were unclear | Accepted: canonical tactical baseline and “Not available” compare semantics added. |
| Sticky layers and balanced density were not testable | Accepted: z-index/scroll ownership and viewport criteria added. |
| Pagination is speculative YAGNI | Rejected: multi-league/thousands-of-players scale and backend pagination were explicitly selected during Understanding Lock; scope is limited to unbounded lists. |
| URL state is speculative | Rejected: preserving tab/filter/page on refresh was explicitly selected; ephemeral input remains local to reduce complexity. |
| Seven primitives are premature | Accepted: only four proven shell primitives are initial; others require two real uses. |
| Big-bang rollout is risky | Accepted: implementation must replace one tab at a time behind the existing shell, retaining the previous tab behavior until its replacement passes parity checks. |

### Constraint Guardian — REVISE

| Objection | Resolution |
|---|---|
| Cache keys omit auth principal and lifecycle clearing | Accepted: principal partitions all Career keys; logout/account change/delete/403 clears the Career cache synchronously. |
| Non-idempotent mutations are unsafe after lost responses | Accepted: request IDs persist original outcomes; automatic retry is disabled and ambiguous failures reconcile before same-ID retry. |
| Scale claim lacks representative data, indexes and performance budget | Accepted: 50,000-player fixture, p95/query-count/response gates and `EXPLAIN ANALYZE` index review added. |
| Offset pages can mix mutable simulation versions | Accepted: Career `dataVersion` prevents cross-version page journeys and resets explicitly on change. |
| URL/cache filters lack canonical normalization | Accepted: one parser/serializer owns canonical URL and query-key state. |

### User Advocate — REVISE

| Objection | Resolution |
|---|---|
| Mobile “basic actions” contradicted full capability parity | Accepted: mobile read/basic-action scope and desktop-only workflows are now explicit and visible. |
| No SLA contradicted an absolute one-second release gate | Accepted: absolute threshold removed; indexed baseline and regression budget retained. |
| Icon-only rail lacked discoverable labels | Accepted: hover/focus labels, persistent active state and repeated context heading specified. |
| Tactics sub-tabs could trigger disruptive dirty prompts | Accepted: one shared draft moves freely between internal sub-tabs; guard applies only when leaving Tactics. |
| Portal could expose two competing primary actions | Accepted: Portal action strip exclusively owns its CTA. |
| One-character search looked broken | Accepted: threshold guidance and explicit clear/reset behavior added. |

### Integrator / Arbiter — APPROVED

The Arbiter reviewed all 27 objections: 16 consolidated Skeptic objections, five Constraint Guardian objections and six User Advocate objections. Every objection is accepted with a design revision or rejected with recorded rationale. No objection remains open; the design is approved for implementation planning.
