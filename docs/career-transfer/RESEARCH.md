# Career Transfer Research

## Overview

Build a private Career transfer market with AI club activity, scouting uncertainty, and bounded negotiation.

## Recommended approach

Use a small PostgreSQL-backed offer state machine owned by `game-service`. Keep listing status on players, store scouting reports and offers in dedicated tables, and process deterministic AI actions during `advance-day`.

## Data requirements

- Player wage, contract expiry, squad role, and transfer status.
- Club wage budget.
- Durable transfer offers with fee, terms, round, expiry, and status.
- Per-club scouting reports with knowledge and progress.

## Integration points

- Existing Career JDBC service and controller.
- Existing `advance-day` loop.
- Existing Career React Query API and Career page.
- Existing smoke runner.

## Risks

Double completion, bankrupt clubs, unplayable squads, AI churn, leaked exact attributes, and slow daily processing. Transactions, squad guards, bounded candidate scans, visibility DTOs, and balance metrics mitigate them.

## Source design

See `docs/plans/career-transfer-design.md` for validated decisions and full scope.
