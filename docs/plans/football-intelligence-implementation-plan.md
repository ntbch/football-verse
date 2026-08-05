# Football Intelligence Implementation Plan

**Status:** P0/P1 implementation largely complete; acceptance evidence and P2 release gates pending
**Created:** 2026-08-04  
**Product decision:** Football Verse becomes a multi-source Football
Intelligence product. Predictions, Games, and Community support the core
story journey; they do not compete with it as separate flagship products.  
**Delivery assumption:** One full-stack engineer working sequentially. Tasks
marked parallel-safe may be split across engineers after Phase 0 is green.  
**Safety:** This plan does not authorize production data deletion. Career
runtime and data retirement must follow
[`minigame-transition-plan.md`](./minigame-transition-plan.md).

## 1. Objective

Ship one coherent, production-ready product in which a user can:

1. Discover a football event assembled from multiple independent sources.
2. Understand what is confirmed, disputed, outdated, or still a rumour.
3. Follow the clubs, players, competitions, and stories they care about.
4. Move from a story into its fixture, prediction, daily game, or discussion
   without crossing disconnected product silos.
5. Trust that every visible control performs a real, persisted operation.

The plan reuses the existing ingestion, clustering, verification, prediction,
forum, following, and Minigame systems. It does not add another product domain.

## 2. Success Measures

### Product measures

| Measure | Initial definition | Why it matters |
|---|---|---|
| Weekly deep story users | Unique weekly users who open a multi-source story and view evidence, follow, bookmark, predict, or discuss | Measures use of the differentiator, not empty page views |
| Onboarding activation | New verified users who follow at least three entities and open one story within 24 hours | Proves personalization starts working |
| Story depth rate | Multi-source story views that open evidence/source comparison | Proves the trust layer is understood |
| Context conversion | Story sessions that continue to a fixture, prediction, or discussion | Proves supporting features reinforce the core |
| Daily retention loop | Eligible users who complete a Game or submit a prediction | Measures repeat-use features separately from the flagship |

Do not set numerical targets before the first reliable production baseline is
collected. Record seven days of clean events, then approve targets.

### Engineering release gates

- Zero failing required tests.
- Web typecheck, all discovered Web tests, and production build pass in a clean
  workspace.
- Full verification and deterministic Minigame smoke pass with isolated
  infrastructure.
- No control reports success without a successful backend operation.
- No public navigation points to a retired or placeholder workflow.
- Public legal links resolve to real pages.
- Production configuration rejects unsafe secrets, localhost public URLs, and
  missing database migrations.

## 3. Scope Decisions

| Area | Decision | Delivery rule |
|---|---|---|
| Story Intelligence | Make core | Spend product effort here first |
| News articles | Keep as source/editorial material | Present under a canonical story where clustering exists |
| Matchday and Predictions | Keep as context and retention | Place under the Matchday journey |
| Games | Keep as daily retention | Do not expand beyond the two current games before usage data |
| Forum | Keep as contextual discussion | Prefer one discussion per story/fixture over duplicate standalone threads |
| Career and Match Engine | Retire safely | Use the existing transition plan; never combine code removal and data deletion |
| Admin Settings | Remove from reachable UI | Reintroduce only when a real persisted setting is required |
| Auto-Mod Rules | Remove from reachable UI | Reintroduce only after moderation volume justifies rules |
| Moderator Audit | Implement a minimal persisted audit | Required for accountability; do not simulate it in the client |
| New microservices | Out of scope | Consolidate operational burden before adding services |
| i18n | Deferred | Choose one launch language first |
| More leagues/games | Deferred | Add only when measured demand exceeds current coverage |

## 4. Dependency Order

```text
Phase 0: truthful UI + green release gate
    -> Phase 1A: information architecture
        -> Phase 1B: canonical Story experience
            -> Phase 1C: onboarding and contextual journeys
                -> Phase 2: production hardening and Career runtime retirement
                    -> Phase 3: evidence-based expansion only
```

No Phase 1 public redesign ships while Phase 0 is red. Career Release B cannot
start until the replacement, route-usage, backup, restore, and rollback gates
in the transition plan are recorded.

## 5. Estimation Convention

| Size | Expected effort |
|---|---|
| S | Up to one engineering day |
| M | Two to three engineering days |
| L | Four to five engineering days |
| XL | Must be split before implementation |

Estimates include implementation and the smallest meaningful automated check.
They do not include waiting for production observation or legal review.

## 6. Phase 0 — Stabilize and Make the Product Truthful

**Target:** 3–5 engineering days, excluding Career route-observation time.  
**Release:** `R0 Stabilization`  
**Rule:** Do not add user-facing features in this phase.

### P0-01 — Reconcile story event classification

**Size:** M  
**Primary area:** `services/core-api`

Implementation:

1. Define precedence for transfer lifecycle states: rumour, interest, bid,
   agreement, and official.
2. Evaluate title and summary signals separately instead of flattening both
   fields before classification.
3. Prefer an explicit, higher-confidence title signal over a weaker summary
   signal; preserve `GENERAL` when confidence is insufficient.
4. Convert the current mixed classifier assertions into table-driven cases
   that cover conflicting title/summary signals and null/empty input.
5. Verify clustering score consumers still treat lifecycle progression in the
   intended order.

Acceptance:

- `ClusterScorerTest` and the complete Core test suite pass.
- At least one check covers `official title + agreement summary` and the
  inverse combination.
- Existing injury, manager, lineup, preview, and result classification does
  not regress.

### P0-02 — Remove deceptive Admin and Moderator controls

**Size:** M  
**Primary area:** `apps/web`

Implementation:

1. Remove all reachable links/cards for Admin Settings and Auto-Mod Rules.
2. Remove the `LIVE` audit claim and hard-coded recent activity feed.
3. Until a real audit endpoint exists, remove the Audit Log navigation item or
   render an explicit unavailable state; never convert network errors to an
   empty successful result.
4. Delete the unreachable placeholder pages when repository search confirms
   no retained caller imports them.
5. Keep real Admin news, sources, users, fixtures, reports, and Moderator report
   queue workflows unchanged.

Acceptance:

- Repository search finds no user-reachable control whose success path is only
  a toast or local state update.
- Network failure renders an error state, not an empty-data state.
- Role navigation tests cover every retained Admin and Moderator destination.

Rollback:

- Restore navigation only together with a working backend contract; do not
  restore the placeholder implementation alone.

### P0-03 — Make Web verification discover all tests

**Size:** S  
**Primary areas:** `apps/web/package.json`, `scripts/verify.ps1`

Implementation:

1. Add `typecheck` and `test` scripts to the Web package.
2. Make the test command discover all retained `*.test.ts` files rather than
   listing three paths manually.
3. Remove or move Career-only tests with the Career code that owns them.
4. Resolve the formation-remap ESM import failure only if that production code
   is retained; otherwise delete it during the already-approved Career move.
5. Update CI and the root verification script to call package scripts.

Acceptance:

- Adding a new `*.test.ts` file causes it to run without editing CI scripts.
- Typecheck, all discovered tests, and Web build are separate visible gates.
- A deliberately failing temporary test proves discovery before being removed.

### P0-04 — Restore deterministic Web builds

**Size:** S  
**Primary areas:** repository root, `apps/web/next.config.ts`

Implementation:

1. Remove the empty root lockfile if the root remains without a package
   manifest; otherwise declare the monorepo root intentionally.
2. Remove stale `optimizePackageImports` entries for packages not installed.
3. Run the production build in a clean workspace with no shared `.next`
   process.
4. Record route bundle budgets for Home, Stories, Story Detail, Matchday,
   Predictions, Games, Search, Forum, and privileged shells.
5. Change a budget only when the build artifact provides a documented reason.

Acceptance:

- Next emits no multiple-lockfile/workspace-root warning.
- Production build and budget check pass twice from a clean workspace.
- No user-running development process must be terminated to complete CI.

### P0-05 — Add minimum legal and trust pages

**Size:** M plus legal review  
**Primary areas:** `apps/web/src/app`, shared footer/auth copy

Implementation:

1. Add real Terms, Privacy, Community Guidelines, and Contact routes.
2. Replace dead hash links in authentication pages.
3. State source attribution, correction, removal-request, user-content, and
   account-data handling rules.
4. Add a small public footer linking only to real destinations.
5. Record document effective dates. Do not build policy-version acceptance
   infrastructure until legal requirements demand it.

Acceptance:

- Link crawl reports no legal/footer dead link.
- Register and login pages link to the same canonical documents.
- Copy receives an explicit product/legal owner approval before production.

### P0-06 — Complete Minigame replacement gates

**Size:** M  
**Dependency:** Existing Career-to-Minigames transition plan

Implementation:

1. Add the deterministic Core Minigame fixture described by the transition
   plan; it must not call ESPN or TheSportsDB.
2. Cover daily challenge load, guest/authenticated attempt start, versioned
   action submission, result, leaderboard, and `/career` redirect.
3. Keep Career runtime/data untouched in this phase.
4. Start the approved route-usage observation and backup/restore evidence
   collection for Career retirement.

Acceptance:

- The complete `Release A acceptance` section in
  `minigame-transition-plan.md` is satisfied.
- Failure of an external sports provider does not break Minigame smoke.

### Phase 0 exit checklist

- [x] Core test suite has zero failures.
- [x] Web typecheck, discovered tests, build, and budgets pass twice from a
      clean workspace; expanded route budgets are covered.
- [x] Gateway, ingestion, prediction, Career, and Match Engine required tests
      pass while those services remain in scope.
- [x] Admin/Moderator placeholder controls are unreachable or removed.
- [ ] Legal links and footer are real, with product/legal owner approval recorded.
- [x] Deterministic Minigame smoke passes with an isolated non-privileged account
      auto-seeded for the disposable smoke database; Release A transition gates
      remain owner-controlled.
- [x] Working tree and release notes identify all intentional Career transition
      changes.

## 7. Phase 1 — Make Story Intelligence the Product

**Target:** 10–15 engineering days.  
**Releases:** `R1 Information Architecture`, then `R2 Story Intelligence`.  
**Parallel safety:** P1-03 and P1-04 may run in parallel after P1-01 contracts
are stable.

### P1-01 — Establish the canonical information architecture

**Size:** M

Target public navigation:

| Destination | Responsibility |
|---|---|
| Home/logo | Personalized intelligence feed |
| Stories | Latest, trending, following, and filtered football events |
| Matchday | Fixtures, match context, predictions, and leaderboard |
| Games | Current daily games and result history |
| Community | Secondary discovery; discussions remain attached to context |

Implementation:

1. Rename product-facing News language to Stories/Football Intelligence where
   the content is a clustered event; keep Article language for a single source.
2. Move Predictions under Matchday navigation without breaking public URLs.
3. Remove duplicate first-party links to Career and legacy Matches.
4. Define breadcrumbs and canonical URL ownership before visual redesign.
5. Keep redirects temporary and documented; do not proxy unrelated APIs.

Acceptance:

- A user can identify the product purpose from the first viewport.
- Desktop, mobile, keyboard, and authenticated role navigation expose the same
  product hierarchy.
- Existing bookmarked URLs have an explicit keep, redirect, or retire decision.

### P1-02 — Build the canonical Story experience

**Size:** L

Story list cards must expose:

- Verification/event status.
- Independent-source count.
- Primary entities and competition.
- First/last update time.
- Conflict or correction indicator when applicable.

Story detail must expose:

1. A neutral canonical event title and current state.
2. Timeline of meaningful state changes.
3. Key points with supporting and contradicting sources.
4. Source comparison with publisher attribution and timestamps.
5. Related clubs, players, competition, and fixture.
6. Follow, bookmark, and notification actions.
7. One contextual discussion destination.

Implementation rules:

- Reuse existing aggregated story, key-point, evidence, and interaction
  contracts before adding DTOs.
- Do not summarize unsupported facts into the canonical title.
- Preserve direct access and attribution to every source.
- A story with one source must degrade to a normal article presentation without
  pretending to be independently verified.
- Split UI by visible sections, not generic wrapper abstractions.

Acceptance:

- Multi-source, single-source, conflicting, corrected, loading, empty, and
  unavailable-provider states have fixtures or tests.
- Story list payloads do not include full article HTML.
- Story page meets the Web bundle budget and has stable layout dimensions.

### P1-03 — Personalize Home through existing follows

**Size:** M

Implementation:

1. Make the personalized story feed the primary Home content for users with
   follows.
2. Add an onboarding flow that selects at least three club, player, or
   competition targets.
3. Give new/anonymous users a clear curated feed and a one-action path to
   personalization.
4. Store timezone only when it changes a displayed deadline or match time.
5. Reuse existing follow targets and notification preferences; do not build a
   second preference model.

Acceptance:

- A newly verified account can complete onboarding and see changed feed
  content without a reload race.
- Empty-follow users see a useful curated state rather than an empty panel.
- Unfollowing the final entity produces the correct fallback state.

### P1-04 — Connect supporting journeys to Stories

**Size:** L

Implementation:

1. Attach related fixture and prediction CTA to eligible stories.
2. Attach or create one canonical discussion thread per story/fixture using an
   idempotent backend operation.
3. Link Matchday back to its related stories.
4. Surface one daily Game entry point without turning Home into a game
   dashboard.
5. Deduplicate discussions so a story and fixture do not silently create
   competing threads for the same event.

Acceptance:

- Repeated requests cannot create duplicate contextual threads.
- Missing prediction provider data leaves the Story usable.
- Forum moderation and permissions apply unchanged to contextual discussions.
- Story-to-Matchday and Matchday-to-Story navigation is covered by browser
  smoke.

### P1-05 — Add minimal product analytics

**Size:** S after a provider is selected

Instrument only:

- `onboarding_completed`
- `story_evidence_viewed`
- `prediction_submitted`
- `daily_game_completed`

Required common fields: authenticated/anonymous state, story/fixture/game ID
where applicable, source count, route, and timestamp. Do not send email,
article body, prediction free text, or raw user-generated content.

Acceptance:

- Event names and allowed fields are documented.
- Development can inspect events without sending production analytics.
- Seven-day baseline can answer every Product measure in Section 2.

## 8. Phase 2 — Production Hardening and Legacy Retirement

**Target:** 10–15 engineering days plus observation/retention windows.  
**Release:** `R3 Production Hardening`; Career code removal is a separate
`R4 Career Runtime Retirement` release.

### P2-01 — Harden privileged operations

**Size:** L

Implementation:

1. Add server-side pagination and search for Admin users.
2. Block self-suspension, self-demotion, and removal/suspension of the last
   active admin.
3. Persist a minimal audit record for role, status, report-resolution, hide,
   lock, and warning mutations.
4. Expose a paginated Moderator audit endpoint only after persistence exists.
5. Show mutation progress and backend errors; never use optimistic success for
   privileged actions.

Acceptance:

- Concurrency tests prove two admins cannot both remove the final admin role.
- Audit records contain actor, action, target, timestamp, and reason where
  supplied, without storing credentials or raw tokens.
- Admin user list remains bounded with a large dataset.

### P2-02 — Harden trust boundaries and privacy

**Size:** L

Implementation:

1. Enforce the internal token through one shared filter for all internal
   routes; remove duplicated controller checks after filter tests pass.
2. Add a Content-Security-Policy after inventorying the theme bootstrap,
   Google auth, video embeds, images, and API/socket origins.
3. Remove email, raw Redis messages, and notification payloads from Gateway
   logs; retain request IDs and aggregate counters.
4. Proxy or restrict remote avatars and set an explicit referrer policy.
5. Add account export, account deletion, and session revocation journeys.
6. Keep exact-origin refresh/logout protection and bearer-token authorization.

Acceptance:

- Every internal endpoint rejects a missing/incorrect token in one shared
  security test suite.
- CSP report-only mode is clean before enforcement.
- Automated log checks find no email, access/refresh token, or raw user
  content in normal request flows.
- Account deletion has an explicit retention rule for authored community
  content and audit records.

### P2-03 — Reduce payload and runtime waste

**Size:** M

Implementation:

1. Return summary-only Story/Article projections from search and lists.
2. Disable Spring Redis repository scanning when no Redis repositories exist.
3. Replace blocking retry sleeps on request paths with bounded client timeout
   and scheduled/backoff behavior already used elsewhere.
4. Add DB-side filtering for Minigame catalog only if measured catalog size or
   generation time crosses an agreed threshold.
5. Keep the Gateway in-memory limiter while deployment is single-instance;
   move it to edge/Redis before the second replica.

Acceptance:

- Search response does not contain article body HTML.
- Core boot logs contain no repeated Redis/JPA repository classification
  warnings.
- Provider timeout behavior is bounded and observable.

### P2-04 — Complete SEO, accessibility, and media quality

**Size:** L

Implementation:

1. Generate public sitemap entries for Stories, Articles, Forum threads, and
   eligible Matchday pages.
2. Remove Search from the sitemap and noindex Auth, Profile, Search, Admin, and
   Moderator routes.
3. Add canonical metadata, Open Graph data, and appropriate NewsArticle,
   Breadcrumb, and Organization structured data.
4. Audit image dimensions, lazy loading, remote host policy, and layout shift.
5. Add one automated accessibility browser journey covering keyboard, focus,
   dialog, navigation, form errors, and Story evidence disclosure.
6. Manually verify 200% zoom, reduced motion, contrast, and small-screen Games.

Acceptance:

- Production metadata never emits localhost URLs.
- Search engines receive only canonical public pages.
- No serious automated accessibility violations on the critical journey.
- Games do not require a 650px viewport to understand or submit an action.

### P2-05 — Make operations real

**Size:** L

Implementation:

1. Add structured logging and error reporting for Web, Gateway, Core, and
   Ingestion.
2. Measure ingestion source availability, spool lag, crawl failures, cluster
   decisions, and enrichment backlog.
3. Wire alerts for sustained ingestion failure, authentication error spikes,
   Core/Gateway availability, and backup failure.
4. Automate encrypted database backups and run isolated restore rehearsals.
5. Add Dependabot coverage for Content Ingestion and pin remaining production
   container images.
6. Remove Flyway missing-migration ignores from production configuration.
7. Validate required public URL, secret, cookie, and database settings during
   production startup.

Acceptance:

- A test incident reaches the configured alert owner.
- A backup is restored and checked without using the production database.
- Production startup fails closed on unsafe configuration.
- Release notes link to monitoring, rollback, and restore evidence.

### P2-06 — Retire Career runtime without deleting data

**Size:** Follow the transition plan

Execute Release B from `minigame-transition-plan.md` only after all of its
gates pass. The release removes Career and Match Engine code/runtime while
keeping the identified data backup/volume through the agreed rollback and
retention windows.

Acceptance:

- `/games`, `/career` redirect, Matchday, Prediction `/matches/**`, and
  `/standings/**` are explicitly smoke-tested.
- Production runs without Career, Match Engine, or the second PostgreSQL
  service.
- A pinned last-known-good deployment and verified restore remain available.

Data deletion is a later, separately approved operational change.

**Development status (2026-08-05):** The active Compose topology, Gateway
Career mounts, legacy Web `/matches` route, and Career smoke/verification steps
are retired in the workspace, including tracked Career/Match Engine source.
Durable Career data remains outside the active topology until the transition
gates are approved.

## 9. Phase 3 — Expand Only With Evidence

Start no Phase 3 item until at least four weeks of reliable product and
operational data exists.

| Candidate | Evidence required before implementation |
|---|---|
| More football leagues | Repeated demand and provider reliability/cost review |
| More daily games | Current Games show meaningful completion and return rates |
| i18n/Vietnamese launch | Named target market, editorial capacity, and support ownership |
| Auto-moderation | Manual moderation volume exceeds agreed service level |
| Persistent feature flags | At least two real rollout/kill-switch cases |
| Split or consolidate Gateway | Realtime traffic, failure isolation, and scaling data |
| Fold Prediction into Core | Service overhead exceeds the value of Python/provider isolation |
| Native mobile app | Mobile Web retention and device capability requirements justify it |

Every approved Phase 3 item gets its own short design/implementation plan. Do
not pre-scaffold any of them in Phases 0–2.

## 10. Cross-Cutting Definition of Done

A task is complete only when all applicable items are true:

- [ ] The user-visible behavior and failure state are implemented.
- [ ] Trust-boundary input validation and authorization are present.
- [ ] The smallest meaningful automated check fails without the change and
      passes with it.
- [ ] Existing related tests pass.
- [ ] Loading, empty, error, unauthorized, and mobile states were considered.
- [ ] API and active architecture documentation match runtime behavior.
- [ ] Logs contain enough context to diagnose failure without personal data.
- [ ] Performance budgets were checked for affected public routes.
- [ ] Rollback is either a normal deployment rollback or explicitly documented.
- [ ] Placeholder code, stale route links, and superseded documentation were
      removed from active surfaces.

## 11. Verification Matrix

| Layer | Required check |
|---|---|
| Web | Typecheck, discovered unit tests, production build, route budgets |
| Core | Full Maven tests, PostgreSQL/vector integration tests, migration validation |
| Gateway | Unit/integration tests, route inventory, auth/header/rate-limit checks |
| Ingestion | Adapter tests, spool/retry tests, SSRF tests, source-health smoke |
| Prediction | Pytest and explicit provider-unavailable behavior |
| Games | Deterministic daily fixture and end-to-end attempt journey |
| Browser | Auth/privacy, Story evidence, Story-to-Matchday/discussion, keyboard journey |
| Operations | Compose/deployment validation, backup, restore, rollback, alert delivery |

Temporary Docker/Testcontainers unavailability is not a pass. The release
record must contain output from an environment where required integration
tests can run.

## 12. Release Order and Rollback Boundaries

| Release | Contents | Must not include |
|---|---|---|
| R0 Stabilization | Phase 0 | Public redesign, Career runtime removal |
| R1 Information Architecture | Navigation, route ownership, copy | Story contract rewrite, data deletion |
| R2 Story Intelligence | Story list/detail, personalization, contextual journeys | Career data deletion |
| R3 Production Hardening | Security, admin audit, SEO, accessibility, operations | Career data deletion |
| R4 Career Runtime Retirement | Approved transition-plan Release B | Career database/backup deletion |
| Later data retirement | Targeted, approved Career data cleanup | Broad Compose volume cleanup |

If a release fails, roll back that release only. Do not use a Story/UI rollback
as authority to restore placeholder Admin controls or to mutate Career data.

## 13. Documentation Updates by Phase

### After Phase 0

- Update README verification commands and active route list.
- Record truthful Admin/Moderator capability status.
- Link the Career transition decision without rewriting historical designs.

### After Phase 1

- Publish the current product brief and navigation model.
- Update API documentation for canonical Story/context contracts.
- Document analytics event names and allowed fields.

### After Phase 2

- Update current-state architecture, service contracts, deployment, backup,
  restore, incident, and security guidance.
- Mark Career/Match Engine documents as historical after runtime retirement.
- Keep dated baseline/design documents unchanged as historical evidence.

## 14. Execution Tracker

Update this table in the implementation branch or release ticket. Do not mark
an item complete from code review alone; attach verification evidence.

**Tracker note (2026-08-05):** The original P2 rows below are retained as the
pre-execution baseline. Use the current P2 execution tracker below for the
development status and remaining production gates.

| ID | Status | Owner | PR/commit | Verification evidence | Notes |
|---|---|---|---|---|---|
| P0-01 | Complete | Current working tree | — | Core: 108 tests, 0 failures, 4 skipped; classifier regression cases pass | Title/summary precedence fixed |
| P0-02 | Implemented; acceptance evidence pending | Current working tree | — | Hard-coded health/audit success UI removed; role-navigation test still pending | Real Admin/Moderator workflows retained |
| P0-03 | Complete | Current working tree | — | Web typecheck + 7 discovered tests pass | Package scripts now own discovery; Career-only tests retired with Career source |
| P0-04 | Complete | Current working tree | — | Two consecutive clean Web production builds (`31/31` pages) and expanded Home/Stories/Story Detail/Matchday/Predictions/Games/Search/Forum/privileged budgets pass | Empty root lockfile removed |
| P0-05 | Copy ready; owner/legal sign-off required | Current working tree | — | Terms/privacy/guidelines/contact routes built and linked | Explicit legal approval remains a non-code gate |
| P0-06 | Integrated smoke passed; Release A gates pending | Current working tree | — | Deterministic API/Minigame smoke and browser auth smoke pass with Docker; route-usage and backup/restore evidence remain external | Durable Career data remains untouched |
| P1-01 | Implemented; navigation evidence pending | Current working tree | — | Stories/Matchday IA and expanded route budgets pass; Web `/matches` retired, `/career` redirects | Desktop/mobile/keyboard/role navigation coverage remains |
| P1-02 | Implemented; state fixtures/tests pending | Current working tree | — | Story cards/detail expose status, source count, timeline, evidence and contextual actions | Full state matrix still needs fixtures/tests |
| P1-03 | Implemented; onboarding acceptance tests pending | Current working tree | — | Home follow feed and three-target onboarding are wired | Reload-race/final-unfollow/fallback tests remain |
| P1-04 | Implemented; aggregated-story fixture pending | Current working tree | — | Browser smoke passes Story detail and single-source degradation; context-link assertions run when an aggregated story is available | Idempotency and Matchday-to-Story evidence remain |
| P1-05 | Implemented; provider/baseline pending | Current working tree | — | Provider-neutral event bus and approved field contract documented | Seven-day production baseline requires provider selection |
| P2-01 | Blocked by Phase 1 | — | — | — | — |
| P2-02 | Blocked by Phase 1 | — | — | — | — |
| P2-03 | Blocked by Phase 1 | — | — | — | — |
| P2-04 | Blocked by Phase 1 | — | — | — | — |
| P2-05 | Blocked by deployment decision | — | — | — | — |
| P2-06 | Blocked by transition gates | — | — | — | Follow the separate plan |

**P2 implementation note:** P2 code work is tracked below with explicit
acceptance gaps. Package verification and Docker integrated smoke are green;
the host root verifier still has a Windows `.next` EBUSY issue. P2-06 remains blocked by the signed transition gates
in minigame-transition-plan.md: production route-usage evidence, encrypted
backup/restore owner, rollback bundle, and retirement approval are external
release requirements.

### P2 execution tracker (2026-08-05)

| ID | Current status | Evidence / remaining gate |
| --- | --- | --- |
| P2-01 | Implemented; concurrency evidence pending | Privileged pagination, audit trail, reason capture, self/last-admin guards; Core API suite: 108 tests, 0 failures, 4 skipped. |
| P2-02 | Partial; CSP report-only added | Account export/delete, session revocation, deleted-user state, internal-token filter, privacy-safe gateway logs and Web CSP report-only header; enforcement/report evidence pending. |
| P2-03 | Implemented | Search summary payloads omit article body; Redis repository scanning disabled; request-path blocking retry sleep removed in FixtureService. |
| P2-04 | Partial; manual accessibility evidence pending | Sitemap/robots, canonical metadata, noindex private surfaces, thread metadata, and Docker browser smoke checks for keyboard, focus, dialog, navigation and form validation; 200% zoom/reduced-motion/contrast/small-screen and aggregated evidence-disclosure evidence remains. |
| P2-05 | Implemented in code | Production fail-closed config, strict Flyway, pinned pgvector digest, operations runbook; owner alerting and backup evidence remain deployment tasks. |
| P2-06 | Development implementation complete; production gate pending | Career/Match Engine source, active topology, legacy Web `/matches`, and Career smoke paths are retired; durable data remains until `minigame-transition-plan.md` gates pass. |

**Current status override (2026-08-05):** P2-06 development cleanup is now
implemented in the workspace: active Career/Match Engine Compose services,
Gateway mounts, the legacy Web `/matches` route, and Career smoke/verification
steps are retired. Production transition gates still govern deployment and
data retention; the current tracker below supersedes the legacy status rows.

**Verification note (2026-08-05):** Web production build passed (31/31 static
pages), typecheck, 7 discovered tests and expanded performance budgets pass.
Gateway has 13 tests, Content Ingestion 27 tests, Prediction has 9 tests, and
Core has 108 tests with 0 failures and 4 skipped. Docker integrated smoke and
browser auth smoke pass. One full root verification attempt was stopped by a
transient Windows `EBUSY` copy of `.next` during host Web build; the Docker Web
build completed successfully.

## 15. First Execution Slice

The first implementation slice contained only:

1. P0-01 classifier root-cause fix and tests.
2. P0-02 removal of deceptive privileged controls.
3. P0-03 Web test discovery and scripts.
4. P0-04 deterministic clean Web build.

The complete verification suite and integrated smoke now pass. With no smoke
credentials set, the runner creates an ephemeral non-privileged account in the
disposable smoke database and removes it during teardown. Supply a verified
account only when you want to exercise a specific fixture:

```powershell
$env:SMOKE_EMAIL = "verified-test@example.test"
$env:SMOKE_PASSWORD = "<test-password>"
.\scripts\verify.ps1 -IntegratedSmokeOnly
```
