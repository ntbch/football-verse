# Daily Matchday Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Football Verse's existing news, matchday, predictions, daily game, and forum features a truthful, testable daily football loop with Core-owned context links.

**Architecture:** Keep the five existing deployables. Core owns persistent `FootballContext` records and links them to fixtures, stories, and forum threads. The Web consumes a contextual read API rather than searching content by team display names; Gateway continues to proxy Core unchanged. The work starts by restoring a clean local baseline, then completes one vertical slice, then retention, reliability, and portfolio evidence.

**Tech Stack:** Next.js 15/React 19/TypeScript, Spring Boot/JPA/Flyway/PostgreSQL, Node test runner, Docker Compose, Python pytest.

## Global Constraints

- Do not create a new deployable, message broker, or event bus.
- Core owns persisted context records and public context API contracts; Prediction remains the authority for provider-backed fixture data.
- The browser communicates through Gateway only; no browser-to-service direct calls.
- Do not fabricate fixture, standing, player, form, source, or community data.
- Expected availability codes are `NO_DATA`, `PROVIDER_UNAVAILABLE`, `UNSUPPORTED`, `AUTH_REQUIRED`, `FORBIDDEN`, and `CONFLICT`.
- Public errors must not expose tokens, upstream bodies, stack traces, payment payloads, email addresses, or raw community content.
- Every changed critical journey needs focused logic coverage, a service-boundary check, and a browser journey before completion.
- Production deployment and enabling paid sales are out of scope.

---

## File Structure

| Path | Responsibility |
|---|---|
| `.gitattributes` | Repository-wide LF normalization rule. |
| `docs/runbooks/baseline-verification.md` | Current, active verification matrix and prerequisites. |
| `services/core-api/.../context/*` | Football Context entity, repository, DTOs, service, and controller. |
| `services/core-api/.../db/migration/V68__football_context.sql` | Context tables, foreign keys, indexes, and the nullable forum-thread context reference. |
| `services/core-api/.../news/*` | Story-context association and story response projection. |
| `services/core-api/.../forum/*` | Optional context attachment when a contextual thread is created. |
| `services/core-api/.../prediction/*` | Fixture context lookup and contextual scored-prediction return links. |
| `apps/web/src/features/context/*` | Typed contextual read client and reusable related-content panel. |
| `apps/web/src/features/news/[slug]/page.tsx` | Story-to-matchday and contextual discussion call-to-actions. |
| `apps/web/src/features/predictions/*` | Matchday-to-context read path, replacing team-name search. |
| `apps/web/src/features/home/*` | Daily Hub participation and contextual-navigation affordances. |
| `apps/web/src/shared/lib/analytics.ts` | Privacy-safe daily-loop event names and allowed identifiers. |
| `apps/web/tests/*` | Deterministic frontend logic and journey-adjacent tests. |
| `docs/case-studies/daily-matchday.md` | Portfolio case study, demo recipe, limits, and verification evidence. |

## Task 1: Restore a reviewable local baseline

**Files:**
- Create: `.gitattributes`
- Modify: `docs/runbooks/baseline-verification.md`
- Modify: `docs/architecture/current-state.md`
- Test: repository status and documented service-local gates

**Consumes:** The active topology in `docs/architecture/current-state.md` and the current five deployables.

**Produces:** A worktree whose semantic diff does not contain line-ending-only noise, plus current verification documentation.

- [ ] **Step 1: Confirm that every current modification is line-ending-only before normalizing**

Run: `git diff --ignore-cr-at-eol --quiet`

Expected: exit `0`. If non-zero, stop and isolate semantic edits before touching normalization.

- [ ] **Step 2: Write the failing repository hygiene assertion**

Add the following rule to `.gitattributes`:

```gitattributes
* text=auto eol=lf
*.bat text eol=crlf
*.cmd text eol=crlf
*.ps1 text eol=crlf
```

- [ ] **Step 3: Normalize the index and verify that only `.gitattributes` is staged**

Run: `git add --renormalize . && git diff --cached --name-only`

Expected: `.gitattributes` only. Do not stage a mass content rewrite.

- [ ] **Step 4: Update the runbook matrix to remove retired Career and Match Engine checks**

Replace the stale matrix with the active Web, Gateway, Content Ingestion, Core API, Prediction, Compose, smoke, and recovery gates. State that missing local dependencies block the gate rather than count as a pass.

- [ ] **Step 5: Run available local verification and record blocked prerequisites accurately**

Run:

```bash
cd services/gateway && npm test
cd services/content-ingestion && npm test
cd services/prediction && python -m pytest -q
cd services/core-api && mvn test
cd apps/web && npm test && npm run typecheck && npm run lint
```

Expected: record a concrete command result for every service; bind-loopback tests must execute in a socket-permitting environment.

- [ ] **Step 6: Commit the baseline task**

```bash
git add .gitattributes docs/runbooks/baseline-verification.md docs/architecture/current-state.md
git commit -m "chore: normalize repository baseline"
```

## Task 2: Create the Core-owned Football Context model

**Files:**
- Create: `services/core-api/src/main/resources/db/migration/V68__football_context.sql`
- Create: `services/core-api/src/main/java/com/footballverse/context/model/FootballContextType.java`
- Create: `services/core-api/src/main/java/com/footballverse/context/model/FootballContext.java`
- Create: `services/core-api/src/main/java/com/footballverse/context/repository/FootballContextRepository.java`
- Test: `services/core-api/src/test/java/com/footballverse/context/FootballContextRepositoryTest.java`

**Consumes:** `Fixture.id`, the durable Core database, and Flyway migration ordering.

**Produces:** A canonical context ID that can represent an exact fixture or another football entity without joining by a display name.

- [ ] **Step 1: Write the failing persistence test**

```java
@Test
void storesOneFixtureContextForEachFixture() {
    Fixture fixture = fixture("provider-123");
    FootballContext first = contexts.save(FootballContext.fixture(fixture, "Man City vs Arsenal"));
    assertThat(contexts.findByFixtureId(fixture.getId())).contains(first);
}
```

- [ ] **Step 2: Run the focused test and confirm it fails before the migration/entity exist**

Run: `mvn -Dtest=FootballContextRepositoryTest test`

Expected: compilation failure for missing `FootballContext` or failing schema creation.

- [ ] **Step 3: Add the schema and domain types**

Use this contract:

```java
public enum FootballContextType { FIXTURE, COMPETITION, CLUB, PLAYER, TOPIC }

public class FootballContext {
    public static FootballContext fixture(Fixture fixture, String displayName);
    Long getId();
    FootballContextType getType();
    String getContextKey();
    String getDisplayName();
    Fixture getFixture();
}
```

`V68__football_context.sql` must create `football_contexts` with `type`, `context_key`, `display_name`, nullable unique `fixture_id`, unique `(type, context_key)`, and indexes for `fixture_id` and `(type, context_key)`. It must also create `news_article_contexts(article_id, context_id)` with a composite primary key and both lookup indexes, then add nullable `context_id` plus an index to `forum_threads`. All foreign keys must reference the existing Core-owned IDs and use no cascade delete from a context into a story or thread.

- [ ] **Step 4: Run the persistence test and Flyway-backed Core suite**

Run: `mvn -Dtest=FootballContextRepositoryTest test && mvn test`

Expected: the focused test and existing Core tests pass.

- [ ] **Step 5: Commit the model**

```bash
git add services/core-api/src/main/resources/db/migration/V68__football_context.sql services/core-api/src/main/java/com/footballverse/context services/core-api/src/test/java/com/footballverse/context
git commit -m "feat: add football context model"
```

## Task 3: Link stories and threads to a context and expose the contextual read API

**Files:**
- Modify: `services/core-api/src/main/java/com/footballverse/news/model/NewsArticle.java`
- Modify: `services/core-api/src/main/java/com/footballverse/forum/model/ForumThread.java`
- Create: `services/core-api/src/main/java/com/footballverse/context/dto/FootballContextResponse.java`
- Create: `services/core-api/src/main/java/com/footballverse/context/dto/ContextualContentResponse.java`
- Create: `services/core-api/src/main/java/com/footballverse/context/service/FootballContextService.java`
- Create: `services/core-api/src/main/java/com/footballverse/context/controller/FootballContextController.java`
- Modify: `services/core-api/src/main/java/com/footballverse/news/dto/NewsArticleResponse.java`
- Modify: `services/core-api/src/main/java/com/footballverse/news/service/NewsArticleService.java`
- Modify: `services/core-api/src/main/java/com/footballverse/forum/dto/ThreadResponse.java`
- Modify: `services/core-api/src/main/java/com/footballverse/forum/service/ForumThreadService.java`
- Test: `services/core-api/src/test/java/com/footballverse/context/FootballContextIntegrationTest.java`

**Consumes:** `FootballContext`, `NewsArticle`, `ForumThread`, `Fixture`, existing response mappers.

**Produces:** `GET /contexts/{id}` and `GET /contexts/fixtures/{fixtureId}` that return exact associated stories and visible threads; story/thread responses expose their optional context summary.

- [ ] **Step 1: Write failing integration cases for exact association, visibility, and no-name-match behavior**

```java
@Test
void fixtureContextReturnsOnlyExplicitlyLinkedPublishedStoriesAndVisibleThreads() throws Exception {
    // Persist fixture + context, an explicitly linked published article/thread,
    // and same-team-name but unlinked records.
    mockMvc.perform(get("/contexts/fixtures/{fixtureId}", fixture.getId()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.articles[0].id").value(linkedArticle.getId()))
        .andExpect(jsonPath("$.data.threads[0].id").value(linkedThread.getId()))
        .andExpect(jsonPath("$.data.articles.length()").value(1));
}
```

- [ ] **Step 2: Run the focused integration test**

Run: `mvn -Dtest=FootballContextIntegrationTest test`

Expected: FAIL because no context endpoint or explicit association exists.

- [ ] **Step 3: Implement explicit associations and read DTOs**

Use a `news_article_contexts(article_id, context_id)` join table because a story can reference multiple contexts. Add nullable `context_id` to `forum_threads` because a contextual thread has one primary discussion context. `ContextualContentResponse` returns:

```java
public record ContextualContentResponse(
    FootballContextResponse context,
    List<NewsArticleResponse> articles,
    List<ThreadResponse> threads
) {}
```

The endpoint filters stories to public/published records and threads to visible records. It returns `404` only when the requested context/fixture context does not exist; an existing context with no associated records returns empty lists.

- [ ] **Step 4: Add authenticated admin mutation endpoints with validation**

Provide `PUT /admin/news/{articleId}/contexts` accepting context IDs and `PUT /admin/forum/threads/{threadId}/context` accepting one nullable context ID. Validate every supplied ID exists, preserve a stable response shape, and require `ADMIN` authority. Do not infer links from title or team text.

- [ ] **Step 5: Run context, news/forum integrity, and Core suites**

Run:

```bash
mvn -Dtest=FootballContextIntegrationTest,ForumModerationIntegrityTest,NewsInteractionIntegrityTest test
mvn test
```

Expected: all selected tests pass; unlinked same-name records remain absent from context output.

- [ ] **Step 6: Commit the contextual API**

```bash
git add services/core-api/src/main/java services/core-api/src/main/resources/db/migration/V68__football_context.sql services/core-api/src/test/java/com/footballverse/context
git commit -m "feat: link stories and threads to football context"
```

## Task 4: Make the Daily Hub and story/matchday journey use the contextual API

**Files:**
- Create: `apps/web/src/features/context/types.ts`
- Create: `apps/web/src/features/context/api.ts`
- Create: `apps/web/src/features/context/contextual-content-panel.tsx`
- Create: `apps/web/src/features/context/contextual-content.test.ts`
- Modify: `apps/web/src/features/predictions/api.ts`
- Modify: `apps/web/src/features/predictions/detail-page.tsx`
- Modify: `apps/web/src/features/news/[slug]/page.tsx`
- Modify: `apps/web/src/features/home/page.tsx`
- Modify: `apps/web/src/features/home/_components.tsx`
- Test: `apps/web/tests/daily-loop.test.ts`

**Consumes:** `GET /contexts/fixtures/{fixtureId}`, story response context summaries, match detail fixture ID, and the existing `ErrorBlock`/`LoadingBlock` components.

**Produces:** Exact cross-links in both directions; no `useMatchRelatedContent(homeTeam, awayTeam)` call remains.

- [ ] **Step 1: Write failing pure rendering tests for contextual state selection**

```ts
import { contextualContentState } from "@/features/context/contextual-content";

test("keeps a match usable when its contextual discussion is unavailable", () => {
  expect(contextualContentState({ status: "error", articles: [], threads: [] })).toEqual("unavailable");
});

test("renders an honest empty state for an existing context without content", () => {
  expect(contextualContentState({ status: "success", articles: [], threads: [] })).toEqual("empty");
});
```

- [ ] **Step 2: Run the focused web test and confirm it fails**

Run: `node --test --experimental-strip-types tests/daily-loop.test.ts`

Expected: module/function-not-found failure.

- [ ] **Step 3: Add typed client and panel behavior**

Define:

```ts
export type ContextualContentResponse = {
  context: { id: number; type: "FIXTURE" | "COMPETITION" | "CLUB" | "PLAYER" | "TOPIC"; displayName: string; fixtureId: number | null };
  articles: NewsArticleResponse[];
  threads: ThreadResponse[];
};

export const useFixtureContext = (fixtureId: number | null, enabled = true) =>
  useQuery({ queryKey: ["context", "fixture", fixtureId], enabled: enabled && Boolean(fixtureId), /* GET /contexts/fixtures/:fixtureId */ });
```

Render loading, empty, unavailable, and successful states. Unavailability must not hide the match or story itself. Every destination uses the returned internal IDs/slugs, not display-name searches.

- [ ] **Step 4: Replace the team-name search path in match detail**

Delete `useMatchRelatedContent(homeTeam, awayTeam, enabled)` and its `GET /search` fan-out. Render the shared panel from `fixture.id`. Link stories to their context fixture and link contextual threads directly.

- [ ] **Step 5: Add story and home entry points**

On a story with a fixture context, render a `View matchday` link using the context fixture ID and league data. On Daily Hub, mark upcoming fixtures that have contextual stories/discussion and route users into that context; preserve truthful no-content/provider-unavailable states.

- [ ] **Step 6: Run the frontend gate**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all pass with no type errors; test output covers successful, empty, and unavailable context paths.

- [ ] **Step 7: Commit the contextual journey**

```bash
git add apps/web/src/features/context apps/web/src/features/predictions apps/web/src/features/news/[slug]/page.tsx apps/web/src/features/home apps/web/tests/daily-loop.test.ts
git commit -m "feat: connect the daily matchday journey"
```

## Task 5: Add contextual thread creation and scored-result returns

**Files:**
- Modify: `services/core-api/src/main/java/com/footballverse/forum/dto/ThreadRequest.java`
- Modify: `services/core-api/src/main/java/com/footballverse/forum/service/ForumThreadService.java`
- Modify: `services/core-api/src/main/java/com/footballverse/prediction/service/ScoringService.java`
- Modify: `apps/web/src/features/forum/components/create-thread-modal.tsx`
- Modify: `apps/web/src/features/context/contextual-content-panel.tsx`
- Test: `services/core-api/src/test/java/com/footballverse/context/FootballContextIntegrationTest.java`
- Test: `services/core-api/src/test/java/com/footballverse/prediction/ScoringServiceTest.java`

**Consumes:** Context IDs, `NotificationService.create`, and `Fixture.fixtureId`/`leagueSlug`.

**Produces:** A thread can be created against the current context, and scored-prediction notifications return to the exact matchday route.

- [ ] **Step 1: Write failing tests for valid contextual thread creation and notification link**

```java
assertThat(threadService.createThread(categorySlug,
    new ThreadRequest("Match thread", "Discuss", List.of(), context.getId())).contextId())
    .isEqualTo(context.getId());

verify(notificationService).create(user, NotificationType.PREDICTION_SCORED,
    contains("earned"), "/matchday/fixture-123?league=premier-league");
```

- [ ] **Step 2: Run the focused failing tests**

Run: `mvn -Dtest=FootballContextIntegrationTest,ScoringServiceTest test`

Expected: constructor/response mismatch and old generic `/predictions` notification link.

- [ ] **Step 3: Implement the minimal contract change**

Add nullable `Long contextId` to `ThreadRequest` and `ThreadResponse`. Resolve it through `FootballContextService.requireContext`; reject unknown IDs with `404`. In `ScoringService`, create the internal route from persisted fixture data:

```java
private String matchdayLink(Fixture fixture) {
    return "/matchday/" + UriUtils.encodePathSegment(fixture.getFixtureId(), StandardCharsets.UTF_8)
        + "?league=" + UriUtils.encodeQueryParam(fixture.getLeagueSlug(), StandardCharsets.UTF_8);
}
```

The contextual panel's create-thread action must send its existing `context.id` and never prefill or emit user-generated content to analytics.

- [ ] **Step 4: Run all affected Core and Web tests**

Run:

```bash
mvn -Dtest=FootballContextIntegrationTest,ScoringServiceTest,ForumModerationIntegrityTest test
cd apps/web && npm test && npm run typecheck
```

Expected: all pass; changing result notification links does not affect privacy or preference behavior.

- [ ] **Step 5: Commit retention return links**

```bash
git add services/core-api/src/main/java/com/footballverse/forum services/core-api/src/main/java/com/footballverse/prediction/service/ScoringService.java services/core-api/src/test apps/web/src/features/forum apps/web/src/features/context
git commit -m "feat: return prediction users to matchday context"
```

## Task 6: Complete privacy-safe daily-loop analytics

**Files:**
- Modify: `apps/web/src/shared/lib/analytics.ts`
- Modify: `docs/analytics-events.md`
- Modify: `apps/web/src/features/home/page.tsx`
- Modify: `apps/web/src/features/news/[slug]/page.tsx`
- Modify: `apps/web/src/features/context/contextual-content-panel.tsx`
- Modify: `apps/web/src/features/predictions/components/pick-form.tsx`
- Modify: `apps/web/src/features/minigames/page.tsx`
- Test: `apps/web/tests/analytics.test.ts`

**Consumes:** Existing provider-neutral browser event bus.

**Produces:** Funnel events that use only stable IDs, route, auth state, and timestamp.

- [ ] **Step 1: Write failing event-schema tests**

```ts
test("daily loop events retain identifiers but reject raw text fields", () => {
  expect(allowedFields("context_opened")).toEqual(["contextId", "fixtureId"]);
  expect(sanitizeEventFields({ title: "private", fixtureId: 7 })).toEqual({ fixtureId: 7 });
});
```

- [ ] **Step 2: Run the focused test**

Run: `node --test --experimental-strip-types tests/analytics.test.ts`

Expected: FAIL because the event names and sanitizer do not exist.

- [ ] **Step 3: Extend the event contract**

Add `daily_hub_opened`, `story_opened`, `matchday_opened`, `context_opened`, `context_thread_started`, `prediction_submitted`, and `daily_game_completed`. Permit only `storyId`, `fixtureId`, `contextId`, `gameId`, `sourceCount`, `route`, `timestamp`, and `authenticated`; remove every other field before dispatching the browser event.

- [ ] **Step 4: Instrument the transition points**

Emit one event per user-initiated transition after the destination/action has been accepted. Do not emit article title, team name, prediction choice, comment, URL query string, email, token, or provider payload.

- [ ] **Step 5: Run the Web verification suite**

Run: `npm test && npm run typecheck && npm run lint`

Expected: all pass; analytics documentation exactly matches the type union and allowlist.

- [ ] **Step 6: Commit analytics**

```bash
git add apps/web/src/shared/lib/analytics.ts apps/web/src/features apps/web/tests/analytics.test.ts docs/analytics-events.md
git commit -m "feat: measure the daily matchday loop"
```

## Task 7: Add deterministic browser coverage and a demo reset path

**Files:**
- Create: `apps/web/tests/daily-loop.browser.test.ts`
- Create: `scripts/daily_loop_smoke.py`
- Modify: `scripts/verify.ps1`
- Modify: `docs/runbooks/baseline-verification.md`
- Test: `apps/web/tests/daily-loop.browser.test.ts`

**Consumes:** The context API, deterministic Core test data, and the existing isolated Compose smoke conventions.

**Produces:** A reproducible guest-to-user daily-loop smoke and browser-visible state coverage.

- [ ] **Step 1: Write the browser test before its fixture/setup support**

```ts
test("guest can inspect a contextual story and authenticated user can predict then open its thread", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /view matchday/i }).click();
  await expect(page.getByText(/related stories|no related stories/i)).toBeVisible();
  // authenticate with an ephemeral smoke identity, submit a valid prediction,
  // then open the contextual discussion.
});
```

- [ ] **Step 2: Run it and confirm it fails because fixtures or routes are absent**

Run: `node ../../services/gateway/node_modules/playwright/cli.js test tests/daily-loop.browser.test.ts`

Expected: failure before implementation establishes deterministic data and selectors.

- [ ] **Step 3: Add only deterministic smoke setup**

`daily_loop_smoke.py` must create or select exact source-backed-style fixture/story/context/thread records in the disposable database, use a generated non-privileged account, and remove only its recorded entities during teardown. It must not read or mutate development data.

- [ ] **Step 4: Cover honest degraded states**

Extend the browser suite to verify that empty context output shows an explicit empty panel and a context API failure shows a retry affordance while keeping the story/matchday content visible.

- [ ] **Step 5: Integrate into verification without bypassing failures**

Add the browser suite to `scripts/verify.ps1` after the existing web build and before cleanup. A skipped Playwright/browser dependency is a failed gate with a specific prerequisite message.

- [ ] **Step 6: Run the isolated smoke and full available matrix**

Run: `./scripts/verify.ps1`

Expected: all prerequisites present and the daily-loop browser journey passes; otherwise record the exact failed prerequisite and do not claim a green baseline.

- [ ] **Step 7: Commit deterministic verification**

```bash
git add apps/web/tests/daily-loop.browser.test.ts scripts/daily_loop_smoke.py scripts/verify.ps1 docs/runbooks/baseline-verification.md
git commit -m "test: verify the daily matchday loop"
```

## Task 8: Publish a truthful portfolio case study

**Files:**
- Create: `docs/case-studies/daily-matchday.md`
- Modify: `README.md`
- Test: manual review against the final command output and demo script

**Consumes:** The completed contextual journey, current verification results, and deterministic demo command.

**Produces:** A concise, reproducible artifact that demonstrates product and engineering decisions without claiming unverified production operation.

- [ ] **Step 1: Write a failing documentation checklist in the case study**

The initial document must contain unchecked assertions for: user problem, daily-loop diagram, ownership, availability states, deterministic demo, verification commands/results, known limitations, no-production-deployment statement, and beta metrics.

- [ ] **Step 2: Run a documentation completeness scan**

Run: `rg -n "^- \[ \]" docs/case-studies/daily-matchday.md`

Expected: the incomplete checklist is found before evidence is written.

- [ ] **Step 3: Replace the checklist with evidence-backed sections**

Document the decision to use explicit contexts instead of display-name search, five deployable owners, the vertical slice, safe availability behavior, the exact local startup/verification commands, results observed during this work, known dependency limits, and the beta metrics defined in the approved spec. Do not claim users, uptime, payment sales, or production operation that has not occurred.

- [ ] **Step 4: Link the case study from README**

Add one Documentation map entry for the case study and one sentence that the project is local-first until an explicitly approved deployment phase.

- [ ] **Step 5: Verify documentation and commit**

Run: `rg -n "TBD|TODO|^- \[ \]" docs/case-studies/daily-matchday.md README.md`

Expected: no unfinished marker or unsupported production claim.

```bash
git add docs/case-studies/daily-matchday.md README.md
git commit -m "docs: add daily matchday case study"
```

## Task 9: Completion audit

**Files:**
- Modify: `docs/superpowers/specs/2026-08-16-daily-matchday-product-direction-design.md` only if verified evidence requires a corrected statement.
- Test: full repository verification matrix and spec-to-evidence audit.

**Consumes:** Every task output and the approved design spec.

**Produces:** A requirement-by-requirement completion record or an explicit remaining-gap list.

- [ ] **Step 1: Create a spec coverage table**

For every section of the approved spec, record the implementation file, test/command that proves it, and result. Treat beta cohort outcomes and production deployment as external future work, not completed claims.

- [ ] **Step 2: Run every repository-owned gate fresh**

Run: `./scripts/verify.ps1`

Expected: successful command exit and all declared suites passing. If environment prerequisites are unavailable, report that the repository-owned implementation is complete but the full gate is unverified; do not state that all verification passed.

- [ ] **Step 3: Inspect the final diff and security boundaries**

Run:

```bash
git diff --check HEAD~1..HEAD
rg -n "context.*(title|team)|search.*homeTeam|search.*awayTeam" apps/web/src services/core-api/src/main/java
rg -n "token|email|comment|content|title" apps/web/src/shared/lib/analytics.ts docs/analytics-events.md
```

Expected: no display-name context joins and no raw/private analytics fields.

- [ ] **Step 4: Commit a corrected audit record only when the audit changed the approved spec**

If the audit exposes an inaccurate verified statement, update only `docs/superpowers/specs/2026-08-16-daily-matchday-product-direction-design.md`, then run:

```bash
git add docs/superpowers/specs/2026-08-16-daily-matchday-product-direction-design.md
git commit -m "docs: record daily loop verification"
```

If the approved spec remains accurate, do not create an empty audit commit.
