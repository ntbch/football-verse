# Career World Simulation Research

## Overview

Convert the demo round-robin into an eight-club world where the player controls one club and AI fixtures use the same full engine.

## Recommended approach

Use a deterministic circle scheduler, persist `matchday_number`, and complete the remaining AI fixtures immediately after the managed fixture. Keep orchestration synchronous, bounded, and idempotent.

## Integration points

Career creation/season rollover, fixture entity/API, managed lineup placement, match persistence, manager policies, standings, UI, and smoke runner.

## Risks

Schedule imbalance, away-side lineup placement, duplicate retries, partial rounds, and slow requests. Scheduler invariants, fixture keys, retry-only scheduled fixtures, and three-call bounds mitigate them.

## Source design

See `docs/plans/career-world-simulation-design.md`.
