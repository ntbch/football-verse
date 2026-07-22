# Career Tactics, Squad and Interactive Matchday

**Status:** Approved with Phase 0 gate  
**Date:** 2026-07-11

## Understanding Summary

- Build one connected flow across visual Tactics, deeper Squad analysis and interactive Matchday.
- Tactics uses a pitch with valid slot-to-slot movement, 15 fixed formations and Role + Duty.
- Squad provides a right-side player inspector, natural-position Depth Chart and two-player comparison.
- Matchday runs request-driven key highlights, pauses for decisions and targets 4–6 minutes.
- Match rules allow five players in three substitution windows; halftime does not consume a window.
- Team/player statistics, xG, fitness, ratings and pressure momentum update between segments.
- Reuse one match-engine core for segmented and full AI simulation.

## Assumptions and Non-Goals

- Desktop-first; mobile supports basic viewing and selection, not complex free dragging.
- PostgreSQL is the source of truth and sessions survive refresh/service restart.
- A segment request targets p95 at or below one second at the current eight-club scale.
- All session endpoints enforce Career ownership; clients never control authoritative match state.
- Maintained by the existing project without new infrastructure or UI dependencies unless native pointer/keyboard handling proves insufficient.
- No multiplayer, staff advice, heatmaps, pass networks, free-form formations or background realtime process.

## Architecture

`TacticalSetup` is shared by all three surfaces: formation, active slots, player assignments, roles, duties, bench and team instructions. Tactics edits the pre-match setup; Matchday creates an authoritative revision and applies confirmed commands; Squad reads the same vocabulary for suitability.

Matchday is a persisted state machine:

1. `start` validates the lineup and creates the unique active fixture session.
2. `continue` runs the segment core from the committed minute to the next highlight/decision boundary.
3. `command` applies a confirmed substitution, formation, role/duty, instruction or shout to future segments.
4. `finish` atomically stores the match, fixture/player effects and completed session.

The active PostgreSQL row stores owner, fixture, status, version, current minute, capped JSON snapshot, deterministic RNG state and substitution counters. Only the active snapshot is retained. Completed debug sessions expire after 30 days through an observable retryable cleanup job.

Full simulation loops the same segment core without user pauses. The legacy full-match path remains only until parity gates pass, then delegates to that core rather than becoming a second engine.

## Phase 0 Hard Gate

Before product implementation, prove that persisted state + RNG state + commands resume deterministically. Replaying the same canonical input must produce byte-equivalent canonical output. Demonstrate crash/resume, duplicate requests and full-simulation looping the same core. If this cannot be proven, segmented Matchday is aborted and the design returns for revision.

## Visual Tactics

The board has 11 fixed slots for the selected formation. Dragging or keyboard source→destination selection swaps assignments; every change has a preview before commit. Formation remapping uses stable suitability and player-ID tie-breakers, previews all moves, preserves compatible roles and moves surplus players to the bench.

Supported formations:

- Four-back: 4-3-3, 4-4-2, 4-2-3-1, 4-1-4-1, 4-3-2-1, 4-2-2-2, 4-4-1-1, 4-5-1, 4-2-4.
- Three-back: 3-5-2, 3-4-3, 3-4-2-1, 3-1-4-2.
- Five-back: 5-3-2, 5-2-3.

Expanded tactical slot labels include LCB/RCB, LDM/RDM, LCM/RCM, LAM/RAM, SS and LST/RST. Engine behavior maps them to stable functional groups such as CB, DM, CM, AM and ST.

Each slot has a compatible Role and Duty (Defend, Support, Attack). Unsupported duties are disabled with a reason and never silently replaced. UI explicitly distinguishes:

- valid assignment;
- positional familiarity;
- heuristic role suitability;
- non-blocking tactical recommendation.

Suitability uses only existing attributes and is labeled heuristic. Formula versions are explicit if scores are persisted or cached. Red cards and unresolved injuries allow fewer than 11 active slots; empty slots show their cause and never trigger a silent player move.

## Squad Analysis

Squad has List, Depth Chart and Compare modes. Selecting a player opens a right-side `PlayerInspector` with overview, existing attributes grouped by category, season form, role suitability and actions. Closing restores focus and scroll to the originating row or slot.

Depth Chart groups Goalkeepers, Centre Backs, Full/Wing Backs, Defensive Midfielders, Central/Attacking Midfielders, Wide Players and Strikers. A player may appear in multiple groups; Primary and secondary familiarity are explicit. Ranking uses familiarity, relevant existing attributes, form and fitness with stable tie-breakers. The UI explains the main factor lowering a player's rank.

Compare is limited to two players. It always displays target role and positional familiarity beside the conclusion. Selecting the first player enters an explicit “choose second player” state with a visible cancel action.

## Interactive Matchday

The screen contains a central 2D pitch/highlight, score/clock/timeline and a side workspace for Overview, Stats, Players, Tactics and Bench. A pause always states its reason: key highlight, halftime, injury, tactical decision or conflict. Fifteen-minute milestones update analysis without blocking play.

Commands include batched substitutions, formation changes, role/duty and team-instruction revisions, plus Encourage, Calm Down, Focus and Push Forward shouts. Draft and applied states are distinct; Continue never discards or silently applies a draft. Shout feedback describes player reaction without guaranteeing an outcome.

Before confirming substitutions, UI states players changed, windows consumed and remaining quota. Multiple substitutions in one confirmation use one window; halftime uses none. Removed players cannot return.

Analytics include possession, shots, shots on target, xG, passes/accuracy, tackles, fouls, corners and player minutes/rating/fitness/goals/assists/shots/passes/tackles. Momentum is labeled a pressure indicator derived from events, never a goal probability.

Portal and Fixtures expose the active session. Attempts to start another fixture explain the lock and link back to the active match.

## Reliability, Security and Limits

- DB constraint enforces one active owned session per fixture.
- Start, command and finish request IDs are persisted and unique with bounded retention; replay returns the original result.
- Session updates match owner + fixture + expected version atomically.
- A stale version returns `409` plus the latest authorized snapshot; client explains another session advanced and retains command drafts.
- Finish atomically finalizes match, fixture, player effects and session; failure rolls back all local state.
- Active sessions block Career advance and another playable fixture. Resume, abandon and Career delete have transactional outcomes and cannot leave locks.
- Validate command enums, lineup eligibility, payload and snapshot size at the boundary. Never trust client minute, score, quotas or final state.
- Cap events, momentum points and snapshot bytes; index owner/fixture/status lookups.
- Log session, fixture, version, command ID, segment range and failure class without full player payloads.

## Delivery Plan

0. Deterministic segmented-engine feasibility gate.
1. Squad/Tactics foundation: position familiarity, formations, role/duty, inspector, compare, Depth Chart and board.
2. Match state machine: persistence, start/continue/command/finish, substitutions, concurrency and full-mode delegation.
3. Interactive Matchday UI: highlights, commands, analytics, resume/conflict UX and post-match.

## Verification Gates

- Every formation has valid slot counts and compatible role/duty matrices.
- Formation changes never duplicate or lose a player; remapping is deterministic.
- Deterministic replay, crash/resume and canonical-output checks pass.
- Duplicate IDs do not rerun a segment, consume quota or apply effects twice.
- Concurrent continue/command calls produce one winner and authorized `409` recovery.
- Ownership isolation, invalid payload and snapshot-size checks pass.
- Five-player/three-window rules cover halftime, batching, injuries and red cards.
- Atomic finish rollback, abandon, delete and stuck-session recovery pass.
- Segment p95 is ≤1 second under current-capacity duplicate/concurrent load.
- Cleanup retention and metrics pass.
- Interactive match and two-season Career smoke tests pass.

## Decision Log

| Decision | Alternatives | Objection / resolution | Rationale |
|---|---|---|---|
| Request-driven segmented match | Precomputed replay; realtime server process | Determinism unproven → Phase 0 hard gate | Real decisions without WebSocket/background lifecycle |
| One segment core | Permanent full and segmented engines | Dual behavior burden → full mode loops segment core | One source of match behavior |
| Fixed valid slots | Free coordinates; hybrid free mode | Formation remap and red-card ambiguity → deterministic preview and dynamic empty slots | Balancing and validation remain tractable |
| 15 preset formations | 8–10; 20+; free creation | Large scope accepted as explicit user goal; delivered after shared foundation | Breadth without arbitrary formation validation |
| Role + Duty | Role only; full individual instructions | Duty compatibility confusion → disabled states with reasons | FM-like depth at bounded complexity |
| Right-side inspector | Dedicated player page; hybrid | Context/focus risk → restore origin focus/scroll | Fast comparison without route expansion |
| Natural-position Depth Chart | Current-formation slots; hybrid | Ranking opacity → explain factors and show secondary groups | Stable squad planning independent of one tactic |
| Two-player compare | Three players; contextual only | Dead-end and misleading roles → explicit second-selection state and target context | Readable comparison |
| PostgreSQL active snapshot | Memory; per-segment history | Growth/recovery risk → capped single snapshot and 30-day completed cleanup | Durable refresh/restart recovery |
| Optimistic version + idempotency | Client locking; silent latest response | Lost commands → explicit authorized 409 retaining drafts | Safe duplicate/concurrent requests |
| 5 players / 3 windows | 3 substitutes; competition config | Batching confusion → confirmation previews and halftime exception | Locked modern rule with clear UX |
| Basic team/player analytics | Heatmaps; full analysis network | Momentum misleading → pressure-indicator disclaimer | Useful feedback using bounded data |

## Structured Review

- Skeptic: all objections accepted and resolved in scope, engine, state, lifecycle, rules, ranking, storage and test gates.
- Constraint Guardian: conditional approval; all determinism, atomicity, security, performance, operations and release gates are mandatory.
- User Advocate: all interaction objections accepted through previews, explicit states, explanations, recovery and accessibility behavior.
- Arbiter disposition: **APPROVED**, conditional on Phase 0 deterministic replay and all recorded gates passing.
