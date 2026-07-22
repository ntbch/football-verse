# Career UI Redesign V2 Implementation Plan

**Design:** `docs/plans/career-ui-redesign-v2-design.md`  
**Status:** UI implementation complete; scale hardening follow-up recorded  
**Date:** 2026-07-21

## Phase 1 — Shared Workspace Foundation

- Keep the eight existing primary tabs and business hooks.
- Add canonical URL state for tab/sub-tab and committed list controls.
- Add reusable sub-tabs and a non-modal desktop/right-sheet detail shell.
- Lock the compact 64px rail, 56px context bar, focus states and responsive layers.

**Gate:** refresh/back-forward preserve navigation; TypeScript and existing Career tests pass.

## Phase 2 — Football Workflow Screens

- Portal: compact action strip, calendar/status grid and secondary settings.
- Fixtures: Schedule/Results, matchday grouping and fixture detail.
- Squad: List/Depth/Compare with player inspector continuity.
- Tactics: Starting XI/Instructions/Match Squad with one shared draft.
- Transfers: Market/Negotiations and recruitment detail.
- Table: Standings/Player Stats.
- Manager: Profile/Board/Decisions/Jobs.
- History: season timeline.

**Gate:** every existing read/mutation remains reachable; 1024/1440 layouts have no page-level horizontal overflow.

## Phase 3 — Large-List APIs

- Apply the paginated contract only to transfer market, negotiations and player statistics.
- Add canonical filters, stable ID tie-breakers, page caps and ownership-first queries.
- Partition Career query cache by principal and clear it on auth lifecycle changes.
- Add request idempotency to non-idempotent Career transitions before exposing ambiguous retry.

**Gate:** ownership, pagination, invalid filters, stable ordering and lost-response replay integration tests pass.

## Phase 4 — Verification and Rollout

- Test URL state, dirty Tactics navigation, panel focus fallback and local error recovery.
- Run TypeScript, focused UI tests, Java/Python suites and production build.
- Record representative query plans and update Career progress documentation.
- Replace tabs incrementally; do not remove the current behavior until its parity check passes.

## Implementation Outcome — 2026-07-22

Completed:

- Career launcher, compact shell, eight workflow tabs, approved sub-tabs and contextual detail panels.
- Each workflow view now lives in its own named tab component; `page.tsx` retains only shared state, data hooks and navigation orchestration.
- URL-backed tab, sub-tab, committed search, page and detail state, including guarded dirty-Tactics navigation.
- Server-paginated Market, Negotiations and Player Stats endpoints with bounded page size, ownership-first access, stable ID tie-breakers and two-character search semantics.
- Principal-partitioned Career query keys, cache clearing on account changes/save deletion, previous-page rendering and cancellable list requests.
- PostgreSQL trigram and list-order indexes in migration `V18__career_large_list_indexes.sql`.

Verified:

- Web TypeScript check passes.
- Five focused URL/playback tests pass.
- Production Next.js build passes; `/career` is 12 kB route code and 180 kB first-load JS in this build.
- Game service: 24 tests pass, 6 PostgreSQL-dependent tests skip when no test database is configured.
- `git diff --check` passes.

Follow-up hardening (not required to render or use the redesigned Career workspace):

- Run the 50,000-player PostgreSQL fixture and capture representative `EXPLAIN ANALYZE` baselines in an environment with the integration database enabled.
- Extend the existing request-ledger pattern from interactive Matchday to every non-idempotent Career transition before adding automatic or user-visible ambiguous-network retry. Mutation retry remains disabled meanwhile.
- Enforce cross-page `dataVersion` conflicts once transfer/scouting mutations increment one shared Career-owned dataset version.
