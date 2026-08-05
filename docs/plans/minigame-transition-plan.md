# Career-to-Minigames Transition Plan

**Status:** Proposed — do not delete production data from this document alone.  
**Decision:** `/games` is the canonical Football Daily product route. The
legacy Career game is retired and will not be replaced or migrated.

**Implemented (2026-08-04):** Minigame moved to `features/minigames`, `/games`
is live, and `/career` redirects there. Career source and active runtime mounts
are retired from the development workspace. All Career data remains untouched
pending the required gates; rollback must use the pinned release bundle.

## Target Naming

| Legacy/current name | Target name | Migration rule |
|---|---|---|
| Web `/career` | Web `/games` | Native Web redirect; never proxy to a Career API |
| `features/career/page.tsx` | `features/minigames/page.tsx` | Move existing code; do not rewrite it |
| `features/career/_minigame-api.ts` | `features/minigames/api.ts` | Move existing client and types |
| `CareerPage` | `GamesPage` | Product-facing component name |
| Navbar `Games` | Navbar `Games` | Label already matches; update href only |
| Core `/api/v1/minigames/**` | unchanged | Already correct |
| Core `minigame_*` tables/package | unchanged | Already correct domain naming |

The Web redirect from `/career` protects bookmarks and external links. Career
API routes `/game/**` and `/api/v1/game/**` must not redirect to Minigames:
their commands and data contracts are unrelated.

## Facts Established Before Removal

- The Web route `/career` currently renders the Minigame UI and calls Core
  `/api/v1/minigames/**`; it is not a Career client.
- `services/career`, `services/match-engine`, `match-game-postgres`, and the
  Gateway `/game/**` upstream form one legacy unit. Match Engine has no other
  consumer.
- `/matches` is the legacy Career Match Centre. `/matchday/[fixtureId]` is a
  Prediction page and **must remain**.
- Gateway `/matches/**` and `/standings/**` are Prediction APIs and **must
  remain**. They only share a word with the retired Web route.
- Minigame data belongs in Core PostgreSQL. Career saves are unrelated to
  Minigame attempts and must not be transformed, imported, or joined.
- Existing Minigame unit tests use mocks; the current integrated smoke does
  not prove a deterministic Minigame journey. It must be fixed before Career
  checks are removed.
- `docs/architecture/current-state.md` and
  `docs/architecture/service-contracts.md` are dated baseline evidence. They
  must not be rewritten as current-state documents.

## What Stays

| Keep | Why |
|---|---|
| Existing Football Daily Minigame implementation, moved to `/games` | Product destination already in use |
| Core Minigame controller, schema, catalog scheduler, attempts and leaderboard | Correct owner of users and daily-game state |
| Core `ApiResponse<T>` and Gateway `/api/v1/**` | Existing common public contract |
| Core PostgreSQL, Redis, Web, Prediction, Content Ingestion | Unrelated deployables |
| `scripts/verify.ps1`, smoke harness, recovery rehearsal | Simplify them; do not replace them |
| `/matchday/[fixtureId]`, Gateway `/matches/**`, `/standings/**`, and Prediction APIs | Separate public matchday product |
| Gateway `INTERNAL_TOKEN`, JWT validation, and shared security config | Still used outside Career |
| Existing Minigame page/client code | Move to `app/games` and `features/minigames`; do not rewrite |

## What Is Retired

The `services/career` and `services/match-engine` source/runtime,
`/game/**`, `/api/v1/game/**`, the separate Career PostgreSQL service/volume,
the legacy `/matches` Web page, Career smoke/balance scripts, and Career-only
Gateway security/configuration are retired from development. The separate
Career database/volume remains outside the active Compose topology.

## Non-Negotiable Safety Rules

1. No production database, volume, backup, or credential is deleted in the
   code-removal release.
2. A repository grep is not evidence of zero external use. Use production
   ingress/Gateway logs for both Career prefixes over an agreed observation
   period, then record the result in the release ticket.
3. Keep a deployable last-known-good Career release and a verified database
   restore until the rollback and retention windows expire.
4. Never run a broad `docker compose down --volumes` against production as
   part of this work.
5. Before deleting any legacy `features/career` file, first move the active
   `page.tsx` and `_minigame-api.ts` to `features/minigames` and prove `/games`
   builds. Never recursively delete the mixed directory while retained files
   remain in it.
6. Do not remove Gateway `/matches/**`, `/standings/**`, `INTERNAL_TOKEN`, JWT
   validation, or shared security helpers. Only Career mounts,
   `gameServiceUrl`, and `game-auth.ts` are Career-only.
7. Historic design and baseline documents remain immutable evidence. Publish
   the new decision in current docs; do not rewrite old plans to pretend they
   made a later decision.
8. Repository Compose may not be the production topology. Inventory the real
   runtime, secret store, backup scheduler, ingress, images, and volumes before
   approving Release B.

## Required Gates

| Gate | Evidence required | Stop when it fails |
|---|---|---|
| Product/data | Named owner approves retirement date, support message, retention period, and restore owner | Approval or retention is undefined |
| Replacement | Isolated Core fixture creates both daily challenges; Web `/games` can load, start, mutate, and read Minigame state without external providers | Minigame relies on ESPN/TheSportsDB during smoke |
| Route usage | API `/game/**`, API `/api/v1/game/**`, and Web `/matches` have no unapproved business callers; Web `/career` usage is measured for redirect retention | Any caller is still active or logs are unavailable |
| Data recovery | Encrypted Career backup checksum matches; restore to isolated PostgreSQL and inspect expected tables/counts | Backup or restore is not proven |
| Rollback | Pinned Gateway, Career, Match Engine, and optional old Web images; deployment manifest; secret references; Git SHA; and restore procedure are available to the release owner | The complete old request path cannot be restored |
| Dependency | Source/import inventory proves Match Engine has no non-Career caller and retained Web/Gateway paths are explicitly listed | A retained caller depends on a removal target |

## Release A — Prove and Close the Boundary

This release changes no Career data and does not delete a runtime.

1. Record the current production deployment, Career database identifier,
   approximate save count, backup location/checksum, and rollback owner.
2. Add a deterministic Minigame SQL fixture loaded only into the isolated
   smoke database after Core Flyway migrations. Use generated player,
   challenge, and answer rows; never enable the fixture in normal runtime and
   never call external providers from smoke.
3. Extend the integrated smoke to verify `/career` loads daily data, starts an
   attempt, submits a versioned action, and reads the leaderboard. Keep the
   existing auth/privacy checks.
4. Move the existing Minigame page/client to `features/minigames`, expose it at
   canonical `/games`, update the Navbar href, and turn `/career` into a native
   temporary redirect to `/games`. Preserve guest state because both paths use
   the same origin and storage key.
5. Verify both `/games` and the `/career` redirect in Web smoke. Update the Web
   performance budget from `/career/page` to `/games/page` without changing
   the established byte limits unless the measured build requires evidence.
6. Confirm there is no reachable first-party link to the legacy Web `/matches`
   route. Keep the route in Release A while its Web ingress usage is observed.
   Do not touch `/matchday/[fixtureId]` or Gateway `/matches/**`.
7. Announce retirement to any approved external Career consumer and observe
   both Gateway prefixes for the agreed period.

**Release A acceptance:** the full verification gate passes with the new
deterministic Minigame smoke, the backup restore is verified, and route usage
has an explicit signed-off result.

## Release B — Remove Code and Runtime Configuration

Perform only after every gate above passes. Keep the Career database volume and
backup untouched.

**Development implementation note (2026-08-05):** The active Compose topology,
Gateway Career mounts, legacy `/matches` page, and Career smoke/verification
steps have been removed in the workspace, and the tracked Career/Match Engine
source has been deleted. Production data and backups are not deleted.

1. Remove only Gateway Career route inventory entries/mounts,
   `GatewayConfig.gameServiceUrl`, `GAME_SERVICE_URL`, `game-auth.ts`, and the
   Career assertions/tests. Preserve Prediction `/matches/**`,
   `/standings/**`, shared auth, `INTERNAL_TOKEN`, and security tests. Do not
   add an envelope adapter or permanent redirect for retired endpoints.
2. Delete `apps/web/src/app/matches/page.tsx` and
   `apps/web/src/features/matches/`. After Release A has moved and verified the
   retained Minigame files, remove the remaining legacy `features/career`
   APIs, types, hooks, components, tactics/navigation helpers, tests, and
   `styles.css`. Keep `app/career/page.tsx` as the small compatibility redirect
   and remove its legacy CSS layout.
3. Delete `services/career` and `services/match-engine` together, then remove
   their Docker services, dependencies, environment-template entries, volume
   declaration, CI caches/installs, Dependabot entries, and Career test steps.
4. Simplify `scripts/verify.ps1`, performance, and smoke scripts only after
   their Minigame replacements pass. Remove the temporary Career DB and Match
   Engine setup; retain isolated Core PostgreSQL verification. Keep
   `recovery_rehearsal.ps1` unless a failing check proves it needs adjustment;
   it is generic and does not depend on Career.
5. Update README, current API/architecture/database/smoke docs, Compose
   guidance, incident/restore runbooks, release notes, and the active
   microservice plan. Do not modify the dated baseline documents or historical
   Career design/research/progress records.

**Release B acceptance:** Web build, Core tests, Gateway tests, Compose config,
revised verification gate, and deterministic integrated Minigame smoke pass;
production deployment starts without Career, Match Engine, or a second
PostgreSQL service. Gateway Prediction `/matches/**` and `/standings/**`, Web
`/matchday/[fixtureId]`, Web `/games`, and the Web `/career` redirect are
explicitly smoke-tested.

## Post-Release Data Retirement

After the agreed rollback and retention windows:

1. Re-run the Career backup restore check and record its checksum.
2. Obtain explicit production-change approval to delete only the identified
   Career database/volume, credentials, and scheduled backups.
3. Delete those resources through the platform's targeted operational command,
   not through a broad Compose cleanup.
4. Record completion, final backup expiry, and retired-route monitoring result.

If the retention period is indefinite or a restore owner is unavailable, stop
after Release B: unused runtime/code can be gone while archived Career data is
kept safely.

## Execution Approval Checklist

Release B is blocked until every item is recorded outside this repository:

- [ ] Retirement owner, date, user notice/export decision, and retention period.
- [ ] Actual production runtime/resource inventory, not inferred from Compose.
- [ ] API and Web route-usage report for the approved observation window.
- [ ] Encrypted backup checksum and successful isolated restore evidence.
- [ ] Rollback bundle for Gateway, Career, Match Engine, deployment config,
      secret references, and database connection.
- [ ] Release A verification output with deterministic Minigame smoke.
- [ ] Named approver for Release B and a different approver for data deletion.

## Change Order

Do not combine Release A, Release B, and data deletion. The smallest safe path
is: prove Minigame independently → measure/announce retirement → remove code
and runtime → delete data only after retention.
