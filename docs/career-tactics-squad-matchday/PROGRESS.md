# Career Tactics, Squad and Matchday Progress

## Status: Phase 3 — Implemented; end-to-end smoke pending

## Quick Reference

- Design: `docs/plans/career-tactics-squad-matchday-design.md`
- Implementation: `docs/plans/career-tactics-squad-matchday-implementation-plan.md`

## Phase Progress

### Phase 0 — Deterministic Engine Gate

**Status:** Completed

#### Tasks Completed

- Added serializable simulation state including RNG, minute, team/player accumulators, events, current tactics and checkpoint flags.
- Extracted `start`, `advance` and `finish`; full `simulate` delegates to the same segment core.
- Added JSON round-trip crash/resume parity test.
- Added byte-equivalent segment replay test.
- Added segment p95 performance gate.
- Ran existing match-engine suite and one-season Career compatibility smoke.

#### Verification

- Match engine: 19 tests passed in 0.49s.
- Segment performance test: 20 runs completed in 0.03s total; p95 assertion below 1s passed.
- Career smoke: 14 managed matches and 56 world fixtures completed.

#### Decisions Made

- Persist Python RNG state as a validated string representation restored with `ast.literal_eval`; no pickle or executable deserialization.
- Keep one active snapshot model; persistence/API work remains Phase 2.
- Preserve current simulation output by making `simulate()` a wrapper over the segment lifecycle.

#### Blockers

- None. Phase 0 hard gate passed.

### Phase 1 — Squad and Tactics Foundation

**Status:** In Progress

#### Tasks Completed

- Added one 15-formation catalog across Python, Java and TypeScript.
- Added Role/Duty validation with backward-compatible role-specific defaults.
- Added visual pitch board with pointer drag/swap and keyboard/click source→destination flow.
- Added Role/Duty controls per tactical slot.
- Added reusable player inspector with attributes, condition and season form.
- Added Squad List, natural-position Depth Chart and two-player Compare modes.
- Persisted the complete lineup and team instructions per Career save.
- Added secondary-position storage/backfill and server-owned Depth Chart scoring with fitness/form reasons.
- Added confirmed formation remapping using primary and familiar secondary positions.
- Added server validation for formation positions, player ownership/availability, roles and duties.
- Preserved and smoke-tested the existing full-match Career flow.

#### Remaining

- Add focused component tests for swap/remap and inspector accessibility.

### Phase 2 — Match Session Backend

**Status:** Implemented — final integration smoke pending

#### Tasks Completed

- Added persisted owner-scoped match sessions with optimistic versions and active Career/fixture uniqueness.
- Added start, active/get, continue, command, abandon and finish endpoints.
- Added resumable engine commands for tactics, lineup revisions, shouts and batched substitutions.
- Added five-player/three-window quota snapshots with halftime-free batch handling.
- Enforced substitution quotas across manual, automatic and injury substitutions.
- Persisted and replayed the original response for every mutating request ID.
- Added serialized PostgreSQL duplicate-request handling and concurrent-writer coverage.
- Returned the latest authorized session snapshot in version-conflict `409` responses.
- Added request/state/event size caps, metadata-only operational logs and 30-day cleanup.
- Tracked red-carded and unresolved-injury players as inactive match slots.
- Blocked full-match and Career progression while a session is active.

#### Remaining Verification

- Run PostgreSQL atomic-finish/rollback, ownership, malformed-payload and restart-resume scenarios in the full Docker smoke.

### Phase 3 — Interactive Matchday UI

**Status:** Implemented — end-to-end smoke pending

#### Tasks Completed

- Added start/resume/continue/command/abandon/finish hooks and active-session Career entry points.
- Added score, clock, pause reason, highlight pitch, timeline filters and Continue/Finish flow.
- Added Overview, Stats, Players, Tactics and Bench workspace tabs.
- Reused `TacticsBoard`, `PlayerInspector` and deterministic formation remapping.
- Added draft/applied match plans, batch substitution previews, quota explanations and retained drafts after conflicts.
- Added team stats, player condition, recent-event pressure indicator and goal-probability disclaimer.
- Added keyboard-operable controls, live announcements and focus restoration after closing player details.

#### Remaining Verification

- Complete a production-like interactive match in the 4–6 minute target.
- Refresh at every pause and verify exact resume plus scroll/focus restoration.
- Run interactive/world matchday/two-season Docker smoke with PostgreSQL integration enabled.

## Session Log

### 2026-07-12

- Completed deterministic/resumable engine feasibility gate.
- Deployed the compatible match-engine runtime to local Docker.
- Started Phase 1 and deployed the visual Squad/Tactics foundation.
- Verified 20 Python tests, 16 Java tests, TypeScript, production builds and one-season Career smoke.
- Deployed Career tactics persistence and squad analysis; Flyway V15 applied successfully.
- Verified 17 Java tests, TypeScript, production Docker builds and another one-season smoke (14 managed / 56 world fixtures).

### 2026-07-21

- Audited Phase 2 and kept it open because idempotency, conflict snapshots, cleanup and integration gates remain.
- Implemented Phase 3 interactive workspace and backend commands required by its UI.
- Closed the critical Phase 2 gaps: durable request replay, serialized duplicate requests, conflict snapshots, resource caps, operational logs and cleanup.
- Added inactive-player handling and quota enforcement for manual, automatic and injury substitutions.
- Applied Flyway V17 and passed six PostgreSQL integration tests, including concurrent duplicate replay.
- Verified 29 Python tests, 23 Java tests (6 PostgreSQL tests skipped by the default profile), TypeScript and 2 focused Matchday tests.
- Completed the production Next.js build successfully (24 generated pages).

## Files Changed

- `backend/game/match-engine/match_engine/domain/match.py`
- `backend/game/match-engine/match_engine/domain/__init__.py`
- `backend/game/match-engine/match_engine/engine/actions.py`
- `backend/game/match-engine/match_engine/engine/simulation.py`
- `backend/game/match-engine/match_engine/engine/__init__.py`
- `backend/game/match-engine/tests/test_simulation.py`

## Architectural Decisions

- Full and segmented simulation share one core.
- Serialized state is immutable Pydantic data and safe to JSON round-trip.
- Product work is allowed to proceed because deterministic replay and compatibility gates passed.
