# Career Tactics, Squad and Matchday Implementation Plan

**Design:** `docs/plans/career-tactics-squad-matchday-design.md`  
**Status:** Phase 2 backend gate and Phase 3 implemented; end-to-end Docker smoke pending  
**Date:** 2026-07-21

## Phase 0 — Deterministic Engine Gate

**Goal:** prove the existing Python engine can be expressed as a resumable segment core before building product features.

### Work

- Define serializable match state: minute, score, lineups, player state, cards, injuries, cumulative stats, events and RNG state.
- Extract a segment function that advances state to a supplied boundary.
- Make full simulation loop the same segment function.
- Canonicalize state/result serialization for byte-equivalent replay checks.
- Add deterministic replay, crash/resume and repeated-segment tests.
- Measure segment p95 at current container capacity.

### Likely files

- `backend/game/match-engine/match_engine/engine/simulation.py`
- `backend/game/match-engine/match_engine/domain/`
- `backend/game/match-engine/tests/test_simulation.py`

### Exit gate

- Same state + RNG + commands produces byte-equivalent canonical output.
- Full simulation uses only the segment core.
- Segment p95 ≤1 second.
- If any condition fails, stop and revise the design; do not start Phase 1.

## Phase 1 — Squad and Tactics Foundation

**Goal:** ship useful Squad/Tactics improvements without depending on interactive Matchday.

### Work

- Add player position familiarity with backward-compatible defaults.
- Add 15 formation definitions and expanded tactical slot labels.
- Add Role/Duty compatibility and versioned suitability calculation using existing attributes.
- Persist one TacticalSetup per Career.
- Add API endpoints to read/save tactic and return suitability/Depth Chart data.
- Build reusable `TacticsBoard` and `PlayerInspector`.
- Add Squad List, Depth Chart and two-player Compare modes.
- Replace select-based lineup editing with board swap/bench interactions and confirmation previews.
- Preserve the current full-match API using saved TacticalSetup.

### Likely files

- `backend/game/game-service/src/main/resources/db/migration/V15__career_tactics_and_positions.sql`
- `backend/game/game-service/src/main/java/com/footballverse/game/career/`
- `backend/game/game-service/src/main/java/com/footballverse/game/dto/`
- `backend/game/game-service/src/main/java/com/footballverse/game/web/CareerController.java`
- `backend/game/match-engine/match_engine/domain/`
- `web-client/src/app/career/_types.ts`
- `web-client/src/app/career/_api.ts`
- `web-client/src/app/career/_formations.ts`
- `web-client/src/app/career/_components/tactics-board.tsx`
- `web-client/src/app/career/_components/player-inspector.tsx`
- `web-client/src/app/career/page.tsx`
- `web-client/src/app/globals.css`

### Verification

- All formations contain correct slot counts.
- Role/Duty matrix rejects invalid combinations with reasons.
- Formation remap is deterministic and never duplicates/loses players.
- Keyboard and pointer swap flows produce identical setup.
- Existing Career one-season smoke remains green.

## Phase 2 — Match Session Backend

**Goal:** implement authoritative, resumable, idempotent segmented matches.

### Work

- Add match-session and idempotency persistence with owner/fixture/status indexes and uniqueness constraints.
- Add start, get/resume, continue, command, abandon and finish endpoints.
- Validate ownership, versions, payload size, enums, lineup and substitution rules at the boundary.
- Implement atomic optimistic session updates and authorized `409` snapshots.
- Add 5-player/3-window rules, halftime exception, red cards, unresolved injuries and dynamic slots.
- Make commands affect only future segments.
- Atomically finish match, fixture, player effects and session.
- Block Career advance/second fixture while a session is active.
- Delegate old full-match flow to the segment core after parity tests.
- Add capped snapshot/event/momentum limits, operational logs and 30-day cleanup.

### Likely files

- `backend/game/game-service/src/main/resources/db/migration/V16__interactive_match_sessions.sql`
- `backend/game/game-service/src/main/java/com/footballverse/game/career/InteractiveMatchService.java`
- `backend/game/game-service/src/main/java/com/footballverse/game/persistence/`
- `backend/game/game-service/src/main/java/com/footballverse/game/web/CareerController.java`
- `backend/game/game-service/src/main/java/com/footballverse/game/engine/MatchEngineClient.java`
- `backend/game/match-engine/`
- `backend/platform/gateway-service/src/proxy.ts` only if routing changes are required.

### Verification

- Start/command/finish request replay returns the original response.
- Duplicate/concurrent continue yields one update and one recoverable `409`.
- Refresh/service restart resumes the exact committed state.
- Ownership isolation and malformed/oversized payload tests pass.
- Atomic finish rollback leaves no partial match or fixture.
- Abandon/delete releases locks; cleanup handles expired completed sessions.

## Phase 3 — Interactive Matchday UI

**Goal:** expose highlights, tactical commands, substitutions and analytics in a recoverable UI.

### Work

- Add session hooks/types for start, resume, continue, commands, abandon and finish.
- Build Matchday layout: score/clock/timeline, 2D highlight, workspace tabs and Continue.
- Reuse TacticsBoard and PlayerInspector for bench/substitution decisions.
- Add substitution batching preview and quota display.
- Add draft/applied distinction for formations, Role/Duty, instructions and shouts.
- Add team/player statistics and pressure momentum disclaimer.
- Add pause reasons, friendly conflict recovery and retained drafts.
- Add Portal/Fixtures resume entry and active-session lock messaging.
- Restore focus/scroll and announce keyboard swaps/substitutions.

### Likely files

- `web-client/src/app/career/_types.ts`
- `web-client/src/app/career/_api.ts`
- `web-client/src/app/matches/page.tsx`
- `web-client/src/app/career/page.tsx`
- `web-client/src/app/career/_components/`
- `web-client/src/app/globals.css`

### Verification

- A full interactive match completes in 4–6 minutes using key highlights.
- Refresh at every pause restores confirmed state.
- Draft commands survive `409` recovery and are never silently applied/discarded.
- Substitution limits and halftime behavior are explained before confirmation.
- Keyboard-only match completion works.
- Interactive match, world matchday completion and two-season smoke pass.

## Release Order

1. Merge Phase 0 only after its gate passes.
2. Release Phase 1 independently behind existing full-match behavior.
3. Keep Phase 2 endpoints unused by default until concurrency/security tests pass.
4. Enable Phase 3 for Career matches; retain a temporary full-match fallback for rollback.
5. Remove fallback only after production-like smoke and parity validation.

## Definition of Done

- All design verification gates pass.
- Match engine, game service and frontend production builds pass.
- Database migrations apply on existing and clean databases.
- Docker two-season smoke passes without error logs or orphan sessions.
- Design Decision Log remains accurate; deviations are recorded before implementation continues.
