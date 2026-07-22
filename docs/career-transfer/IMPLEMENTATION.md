# Career Transfer Implementation Plan

## Overview

Implement the validated DB state machine in small end-to-end phases, reusing the existing JDBC Career service and UI patterns.

## Phase summary

1. Persistence and domain state.
2. Offer/scouting service and API.
3. Deterministic daily AI market.
4. Transfer UI, smoke metrics, tests, and docs.

## Phase 1: Persistence and domain state

- [x] Add player contract and transfer fields.
- [x] Add club wage budget.
- [x] Add transfer offers and scouting reports.
- [x] Seed/backfill safe defaults and constraints.

Success: Flyway migration applies and game-service tests boot.

## Phase 2: Offer/scouting service and API

- [x] Replace direct purchase with market visibility DTOs.
- [x] Add scouting start/progress.
- [x] Add offer submit/respond/terms/complete transitions.
- [x] Make completion transactional and idempotent.

Success: focused state, visibility, and completion tests pass.

## Phase 3: Daily AI market

- [x] Score bounded listed candidates and surplus players.
- [x] Process one deterministic action per AI club/day.
- [x] Enforce budget and minimum squad coverage.

Success: deterministic AI test and runtime guard pass.

## Phase 4: UI and operational validation

- [x] Add Transfer tab, scouting, and offer controls.
- [x] Add transfer balance metrics to smoke script.
- [x] Update API/database/smoke docs.
- [x] Run Java, TypeScript, Python, and diff checks.

Success: all checks pass and progress log is complete.
