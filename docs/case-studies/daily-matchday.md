# Daily Matchday: source-backed football context to a daily return loop

## The problem

Football products often separate news, match predictions, games, and community
discussion into unrelated destinations. A fan can read a story but has no
truthful way to tell whether it relates to the fixture they are following, and
the product has no dependable route back after a prediction or game.

Daily Matchday makes one small loop explicit:

```text
Daily Hub → source-backed story or Matchday → exact fixture context
          → prediction, game, or contextual discussion → return link
```

The goal is a useful local product journey, not manufactured engagement or a
claim of production deployment.

## What changed

Core owns a durable `FootballContext` for an exact fixture and explicit links
from published stories and visible forum threads. The public
[`GET /contexts/fixtures/{providerFixtureId}`](../../services/core-api/src/main/java/com/footballverse/context/controller/FootballContextController.java)
contract returns that context and only its linked content; it does not infer a
relationship from team names. The context model and database constraints live
in [the Core context package](../../services/core-api/src/main/java/com/footballverse/context)
and [Flyway migration V68](../../services/core-api/src/main/resources/db/migration/V68__football_context.sql).

The Web uses the typed context query in [the match detail page](../../apps/web/src/features/predictions/detail-page.tsx)
and renders loading, unavailable, empty, and linked-content states with
[the reusable panel](../../apps/web/src/features/context/contextual-content-panel.tsx).
A fan can move from a fixture to an explicitly linked story or thread; when
they start a discussion, the created thread carries the context ID. Scored
prediction notifications also return to the precise Matchday route rather than
a generic destination.

## How we know it is real

The evidence is executable, not a screenshot claim:

- [Core context integration coverage](../../services/core-api/src/test/java/com/footballverse/context/FootballContextControllerIntegrationTest.java)
  checks exact association, visibility, admin assignment, and context-aware
  thread creation.
- [Focused Web logic tests](../../apps/web/tests/daily-loop.test.ts) cover
  unavailable and empty context states.
- [The deterministic browser acceptance test](../../apps/web/tests/daily-loop.browser.test.ts)
  signs in as a generated non-privileged account, opens the linked story and
  thread, creates a context-linked discussion, confirms a failed context API
  leaves the match visible, retries successfully, then verifies the empty
  state.
- [The smoke setup and cleanup script](../../scripts/daily_loop_smoke.py)
  creates unique fixture, source-backed story, context, thread, and user
  records in the disposable Compose database, verifies the API contract, and
  removes only those recorded entities in `finally`. It is invoked from
  [the integrated verification gate](../../scripts/verify.ps1).

This work was delivered through the context, journey, return-loop, analytics,
and smoke-test commits on `agent/strengthen-news-clustering`, most recently
`a3965cbb` for browser hardening.

## Measurement with privacy boundaries

The browser emits only a small, allow-listed event contract:
`daily_hub_opened`, `story_opened`, `matchday_opened`, `context_opened`,
`context_thread_started`, `prediction_submitted`, and
`daily_game_completed`. The contract accepts stable IDs where needed and
rejects titles, team names, free-form posts, query strings, tokens, and other
raw content. See [the analytics event contract](../analytics-events.md).

The beta measures transition, completion, discussion participation, D1/D7
return, provider failure, and useful partial-page rates. It has targets for a
14-day cohort of at least 20 consenting users: 50% full-loop completion, 25%
D1 return, 10% D7 return, and fewer than 5% unhandled daily-loop provider
failures. These are validation targets from [the approved product direction](../superpowers/specs/2026-08-16-daily-matchday-product-direction-design.md),
not observed production results.

## Verification and limits

The retained Web suite and typecheck pass locally. The full Daily Matchday
browser smoke is deliberately part of the Compose integrated gate and fails
when its Playwright prerequisite is absent; it is never silently skipped.

This workspace cannot access a Docker daemon and does not include PowerShell,
so `./scripts/verify.ps1` and its isolated browser topology were not executed
here. That is an environment limitation, not a green end-to-end result. The
next verifier should run the documented command on a machine with Docker,
PowerShell, Node, Java/Maven, and Python available.

There is no deployment or production payment activation in this deliverable.
The portfolio value is the traceable product slice: a source-backed football
context, safe analytics contract, deterministic evidence, and an honest
handoff for a local-first project still under development.
