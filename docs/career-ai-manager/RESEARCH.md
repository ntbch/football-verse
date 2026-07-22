# Career AI Manager Research

## Overview

Add persistent named managers whose traits drive club and matchday decisions through deterministic policies.

## Recommended approach

Use one numeric policy pipeline in `game-service`; snapshot a bounded manager plan into each team input so `match-engine` stays stateless. Persist manager careers, objectives, pressure, jobs, and compact decision reasons.

## Integration points

- Career creation, daily progression, fixture play, training, tactics, and transfer market.
- Java/Python `TeamSnapshot` contract.
- Career UI and multi-season smoke runner.

## Risks

Invalid lineups, sack churn, reaction spam, trait dominance, fatigue spirals, and unfilled vacancies. Hard lineup constraints, cooldowns, moderate weights, bounded checkpoints, and deterministic fallbacks mitigate them.

## Source design

See `docs/plans/career-ai-manager-design.md`.
