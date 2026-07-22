# Career World Simulation Implementation Plan

## Phase 1: League schedule

- [x] Add matchday number to fixtures.
- [x] Seed eight clubs and 14-round circle schedules.

## Phase 2: Managed fixture

- [x] Restrict player play to managed-club fixtures.
- [x] Place player lineup/tactic on correct home or away side.
- [x] Block advance for due managed fixtures.

## Phase 3: AI round completion

- [x] Simulate remaining round fixtures with full manager plans.
- [x] Persist with deterministic seeds and idempotent keys.
- [x] Add incomplete-round retry action.

## Phase 4: UI and validation

- [x] Label fixtures by matchday and expose completion status.
- [x] Update smoke metrics and docs.
- [x] Add scheduler, managed-away, retry integration, and regression tests.
