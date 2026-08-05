# Daily Intel Run Design

**Status:** Approved after multi-agent architecture review — ESPN + TheSportsDB confirmed  
**Date:** 2026-08-01  
**Scope:** Redesign the two existing `/career` minigames as one daily experience. This does not remove or alter the separate Career service, its routes, or `match_game_db`.

## Confirmed product decisions

- Who Am I and Football Grid replace the Career entry UI as football puzzles, not management gameplay.
- One shared challenge is published per Vietnam-local (UTC+7) day.
- A normal daily run is five minutes, scores a maximum 75, and ranks by score then elapsed duration.
- The audience is mainstream football fans and desktop is the primary surface.
- Guests may complete a run and sign in afterwards to retain/rank it.
- The page has personal history/streaks and one shared leaderboard.
- The visual system reuses Football Verse's `SportsShell`, navbar, magazine tokens, editorial panels, light/dark themes and accessibility conventions.

## Existing project baseline

Core already owns daily minigames at `/minigames`. It persists `minigame_players`, immutable per-date/per-game `minigame_challenges`, and authenticated `minigame_attempts`; it already provides autocomplete, optimistic versions, snapshots, daily leaderboards and a scheduler. The current UI at `/career` consumes these two independently startable games.

The redesign extends this Core-owned system. It must not create a second puzzle store or call a provider from the browser. ESPN roster import plus TheSportsDB enrichment is the confirmed production source.

## Experience and UI

One Daily Intel Run creates both round attempts together and gives them one server-owned start/deadline. The player completes Who Am I then Grid; only a completed daily run appears in the combined leaderboard. Practice remains unranked and is separate from the official run.

### Evidence Room (Who Am I)

The player starts with two accessible facts and may reveal up to three optional evidence cards. Evidence appears as a compact timeline around an unknown-player profile. A single autocomplete command bar accepts up to three guesses. Optional evidence and incorrect guesses each deduct 5 from a maximum 30; an unsolved round is 0. The recap explains the answer after resolution.

### Scout Board (Football Grid)

The page renders a 3x3 board, but only one selected cell exposes the Scout Terminal with criteria, autocomplete, preview and Lock answer action. Each cell has one submission; wrong answers lock it empty, valid players lock as chips, and players cannot repeat. Each correct cell earns 5, maximum 45.

Autocomplete uses proper combobox/listbox keyboard behaviour (arrow keys, Enter, Escape), and all reveal/lock/version failures stay visible beside the action. Colour states include text/icon labels. Motion is short and respects reduced-motion preferences.

## Data, ownership and fairness

### Provider scope

Core keeps ESPN as the roster source and TheSportsDB for historical enrichment. Snapshot generation only uses fields present and verified in the local catalogue: identity, nationality, position, current club, career clubs, seasonal facts and trophy count. If a field is missing, the generator excludes it from a criterion; it does not invent a fact or make a live provider request during play.

### Publication

The importer completes before puzzle generation. A Core scheduled publisher uses a PostgreSQL-backed single-publisher guard and creates a challenge only after validating every Grid cell, a distinct-player solution, and a non-empty Who Am I evidence set. Public `GET /daily` is read-only: it never lazily creates a challenge. At reset, an unavailable new snapshot displays an explicit preparing/unavailable state; it never serves yesterday's puzzle as today's shared challenge.

### Runs and guests

Add one `minigame_daily_runs` record as the authoritative owner of two existing game attempts, with `play_date`, `started_at`, `deadline_at`, `completed_at`, duration and status. Action endpoints reject attempts past the deadline and complete the run from its stored state; a scheduled expiry is not required for correctness.

For guest play, extend attempt/run ownership with a random opaque guest token stored only as a hash, in a secure HttpOnly cookie. A row belongs to exactly one guest token or user. Guest results are unranked until a one-time transactional claim attaches them to an authenticated user; an account with an official run for that date cannot claim another. Tokens expire after the local day. This replaces the current authentication-only contract and `user_id NOT NULL` model; it is not a client-only workaround.

Answers, accepted IDs, scoring and elapsed duration remain server-authoritative. Snapshot autocomplete searches only its frozen catalogue/answer IDs, not a refreshed global catalogue. Existing optimistic version conflicts remain a visible “state changed; refreshed” response; the MVP guarantees no duplicate score, not replay-style mutation idempotency.

## Ranking, history and operations

Only completed official daily runs rank. The leaderboard uses bounded SQL queries: top 100 and a separate rank lookup; it does not load all attempts into memory. A personal history view derives completed runs by UTC+7 dates; a streak is consecutive completed official days, and a failed/uncompleted day breaks it. Fallback single-round days have a separate 30-point leaderboard scope and explicit label, so they are never compared to normal 75-point days.

No Redis, queue, WebSocket or extra service is part of MVP. Existing gateway limits are not claimed as adequate abuse protection; database ownership, deadline checks and bounded search are the minimum protections. Capacity claims require a new measured leaderboard baseline before release.

## Verification

- Import tests verify ESPN/TheSportsDB field normalisation and that incomplete players never enter an unsupported criterion.
- Publisher tests prove import-before-publish, one publisher, no lazy public creation, fully valid grids and fallback availability state.
- Transaction tests cover deadline enforcement, no repeated player, score calculation, optimistic conflict, guest token expiry/claim and one official run per user/date.
- Query tests verify bounded leaderboard/rank queries and record their p95 baseline.
- UI tests cover selected-cell terminal, keyboard autocomplete, visible action errors, locked states, recap and reduced motion.

## Review decision log

| Decision / objection | Resolution |
| --- | --- |
| Existing Core minigame persistence and APIs were omitted | Accepted: extend the Core model; do not create parallel challenge/attempt/result storage. |
| API-Football was named without an owner or demonstrated data | Resolved by product decision: retain the existing Core-owned ESPN roster import and TheSportsDB enrichment. |
| Guest play conflicts with authenticated attempts | Accepted: document an opaque-token ownership migration and deferred ranking until claim. |
| A five-minute combined run has no current state model | Accepted: add a single daily-run record with authoritative deadline/duration; preserve the existing per-round attempts beneath it. |
| Scheduler can publish incomplete/lazy snapshots | Accepted: import-before-publish, read-only public lookup and a PostgreSQL publisher guard are required. |
| Existing retry/leaderboard/rate-limit claims were too strong | Accepted: retain optimistic conflict UX, bound ranking in SQL, require a measured baseline, and do not claim gateway abuse coverage. |
| Current UI is crowded and error feedback/keyboard support are weak | Accepted: one Scout Terminal, semantic autocomplete and inline error states are release requirements. |
| Old Career deployment removal was ambiguous | Accepted: this plan changes the public `/career` screen only; old Career deployment is explicitly retained and out of scope. |

## Arbiter disposition

**APPROVED.** The product owner confirmed ESPN + TheSportsDB, removing the sole prior blocker. The arbiter accepted the revised model because it reuses the Core-owned catalogue flow and explicitly addresses ownership, publication, guest claim, deadline, bounded ranking, UI requirements and required migrations/tests.
