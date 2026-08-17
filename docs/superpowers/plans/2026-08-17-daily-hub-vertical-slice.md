# Daily Hub Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the source-backed Home → News → Matchday → Prediction → Forum loop while preserving Football Verse's existing editorial design and making Matchday the canonical fixture-detail route.

**Architecture:** Extend the existing `FootballContext` read contract with public reverse navigation, reuse it from focused Web components, and expose provider freshness already present in the Prediction boundary. Keep the five current deployables and database ownership unchanged; Phase 1 adds no service, broker, database, synthetic runtime fallback, or full localization framework.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.6, TanStack Query 5, Java 21, Spring Boot 3.3, PostgreSQL/Flyway, Python/FastAPI, Node test runner, JUnit 5, Playwright smoke tests, Docker Compose.

## Global Constraints

- Preserve the current ivory/terracotta editorial design, Georgia-style display typography, system sans body typography, rounded editorial panels, and light/dark themes.
- Runtime football data must remain real and source-backed; never add fabricated articles, fixtures, standings, scores, players, or provider success states.
- Premier League is the only competition required by this phase.
- Gateway remains the only public API edge; no deployable may write another deployable's database.
- `/matchday/[fixtureId]` is the canonical fixture-detail route.
- Keep public reading available without authentication; existing mutations continue to require real accounts.
- Phase 1 creates locale-safe seams only. Do not add `/vi` and `/en` route trees or claim full bilingual completion in this plan.
- Use TDD for behavior changes, run the narrow test after each change, and commit each task independently.
- Do not stage or commit `.superpowers/` visual-companion session files.

---

## File Map

### New files

- `docs/superpowers/reports/2026-08-17-daily-hub-baseline.md` — immutable pre-change verification evidence.
- `apps/web/src/features/context/context-links.ts` — pure canonical-link functions for fixture contexts.
- `apps/web/src/features/context/context-links.test.ts` — link and context-selection behavior.
- `apps/web/src/features/context/context-navigation.tsx` — shared editorial context backlink/list UI.
- `apps/web/src/features/home/daily-journey.ts` — pure featured-fixture selection.
- `apps/web/src/features/home/daily-journey.test.ts` — featured-fixture selection tests.
- `apps/web/src/features/home/daily-journey-panel.tsx` — compact Home connection among fixture, story, and thread.
- `apps/web/src/features/predictions/routes.ts` — pure canonical Matchday URL builder.
- `apps/web/src/features/predictions/routes.test.ts` — redirect preservation and sanitization tests.
- `apps/web/src/features/predictions/source-freshness.ts` — pure freshness-state policy.
- `apps/web/src/features/predictions/source-freshness.test.ts` — live/upcoming/result freshness thresholds.
- `apps/web/src/features/predictions/components/source-freshness.tsx` — source/freshness presentation using existing tokens.
- `apps/web/src/features/predictions/components/matchday-hero.tsx` — focused extraction of the existing Matchday summary and freshness line.
- `services/core-api/src/test/java/com/footballverse/prediction/MatchCentreSourceAvailabilityTest.java` — Core detail provenance contract.

### Modified files

- `services/core-api/src/main/java/com/footballverse/context/dto/FootballContextResponse.java` — add nullable fixture navigation fields.
- `services/core-api/src/main/java/com/footballverse/context/service/FootballContextService.java` — reusable projection and reverse lookups.
- `services/core-api/src/main/java/com/footballverse/context/controller/FootballContextController.java` — public article and context lookups.
- `services/core-api/src/test/java/com/footballverse/context/FootballContextControllerIntegrationTest.java` — reverse-navigation contracts and unpublished guard.
- `apps/web/src/features/context/types.ts` — match Core context navigation fields.
- `apps/web/src/features/context/api.ts` — article-context and single-context queries.
- `apps/web/src/features/news/[slug]/page.tsx` — render source-backed Matchday navigation.
- `apps/web/src/features/forum/threads/[slug]/page.tsx` — load the thread's context.
- `apps/web/src/features/forum/components/thread-header.tsx` — render the Matchday backlink.
- `apps/web/src/features/home/page.tsx` — insert the connected daily journey without replacing the existing hero.
- `apps/web/src/app/predictions/[fixtureId]/page.tsx` — server redirect to canonical Matchday.
- `apps/web/src/features/predictions/detail-page.tsx` — canonical return link and source-freshness UI.
- `services/prediction/providers/league_policy.py` — retain availability on fixture-detail responses.
- `services/prediction/tests/test_prediction_service.py` — fixture-detail provenance contract.
- `services/core-api/src/main/java/com/footballverse/prediction/dto/MatchDetailResponse.java` — expose fixture availability.
- `services/core-api/src/main/java/com/footballverse/prediction/service/MatchCentreService.java` — project provider availability or truthful unavailability.
- `apps/web/src/features/predictions/types.ts` — add detail availability.
- `apps/web/tests/daily-loop.browser.test.ts` — exercise the entire connected journey and legacy redirect.
- `scripts/daily_loop_smoke.py` — provide deterministic browser-only provider responses while keeping Core context/news/forum integration real.
- `docs/case-studies/daily-matchday.md` — document the completed Phase 1 evidence and limits.
- `docs/runbooks/baseline-verification.md` — update exact retained test counts only after final verification.

---

### Task 1: Record the Pre-Change Baseline

**Files:**
- Create: `docs/superpowers/reports/2026-08-17-daily-hub-baseline.md`
- Reference: `docs/runbooks/baseline-verification.md`
- Reference: `scripts/verify.ps1`

**Interfaces:**
- Consumes: repository verification commands as they exist at commit `634bf675` or its direct descendant containing no Phase 1 code.
- Produces: exact pass/fail evidence that later tasks must not silently weaken.

- [ ] **Step 1: Confirm the worktree contains no unrelated staged changes**

Run:

```bash
git status --short
git rev-parse --short HEAD
```

Expected: only `.superpowers/` may be untracked; no product file is staged. Record the short SHA.

- [ ] **Step 2: Run the repository verification matrix before changing code**

Run from the repository root in PowerShell:

```powershell
./scripts/verify.ps1
```

Expected: final line `All verification steps passed.`. If a prerequisite is missing or any gate fails, stop implementation and report the exact failing command; do not call the baseline green.

- [ ] **Step 3: Record exact baseline evidence**

Create `docs/superpowers/reports/2026-08-17-daily-hub-baseline.md` with this structure, replacing command-result prose with the exact observed output rather than estimates:

```markdown
# Daily Hub Phase 1 Baseline

Date: 2026-08-17
Scope: pre-change verification for the Daily Hub vertical slice.

## Repository state

- Commit: the short SHA printed by `git rev-parse --short HEAD`.
- Product changes present before this phase: none.
- Ignored from evidence: untracked `.superpowers/` browser-companion files.

## Verification

- Command: `./scripts/verify.ps1`
- Result: pass only when the runner prints `All verification steps passed.`
- Failed or unavailable prerequisites: list the exact prerequisite name, or write `none` after a full pass.

## Guardrail

Phase 1 may add coverage and change expected test counts, but it may not remove a verification gate or turn a missing prerequisite into a pass.
```

- [ ] **Step 4: Check the report and commit it**

Run:

```bash
git diff --check -- docs/superpowers/reports/2026-08-17-daily-hub-baseline.md
git add docs/superpowers/reports/2026-08-17-daily-hub-baseline.md
git commit -m "docs: record daily hub baseline"
```

Expected: one documentation-only commit.

---

### Task 2: Add Public Reverse Context Navigation

**Files:**
- Modify: `services/core-api/src/main/java/com/footballverse/context/dto/FootballContextResponse.java`
- Modify: `services/core-api/src/main/java/com/footballverse/context/service/FootballContextService.java`
- Modify: `services/core-api/src/main/java/com/footballverse/context/controller/FootballContextController.java`
- Test: `services/core-api/src/test/java/com/footballverse/context/FootballContextControllerIntegrationTest.java`

**Interfaces:**
- Consumes: `NewsArticle.contexts`, `ForumThread.context`, `FootballContext.fixture`, and the current public `GET /contexts/**` security rule.
- Produces: `GET /contexts/articles/{articleId}` returning `ApiResponse<List<FootballContextResponse>>`; `GET /contexts/{contextId}` returning `ApiResponse<FootballContextResponse>`; `FootballContextResponse(id, type, key, displayName, fixtureId, leagueSlug)`.

- [ ] **Step 1: Write failing integration tests for article and single-context navigation**

Add tests that use the existing `fixture`, `article`, and repository helpers:

```java
@Test
void publishedArticleContextsExposeCanonicalFixtureNavigation() throws Exception {
    Fixture fixture = fixture("provider-fixture-article-navigation");
    FootballContext context = contexts.saveAndFlush(FootballContext.fixture(fixture, "Liverpool vs Chelsea"));
    UserAccount author = users.saveAndFlush(new UserAccount(UUID.randomUUID() + "@user.local", "articleNavAuthor", "pass"));
    NewsArticle linked = article("article-navigation", "Article navigation", author);
    linked.getContexts().add(context);
    linked = articles.saveAndFlush(linked);

    mockMvc.perform(get("/contexts/articles/{articleId}", linked.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].fixtureId").value("provider-fixture-article-navigation"))
            .andExpect(jsonPath("$.data[0].leagueSlug").value("premier-league"));

    mockMvc.perform(get("/contexts/{contextId}", context.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.fixtureId").value("provider-fixture-article-navigation"))
            .andExpect(jsonPath("$.data.leagueSlug").value("premier-league"));
}

@Test
void unpublishedArticleDoesNotExposePublicContextNavigation() throws Exception {
    Fixture fixture = fixture("provider-fixture-draft-navigation");
    FootballContext context = contexts.saveAndFlush(FootballContext.fixture(fixture, "Draft context"));
    UserAccount author = users.saveAndFlush(new UserAccount(UUID.randomUUID() + "@user.local", "draftNavAuthor", "pass"));
    NewsArticle draft = article("draft-navigation", "Draft navigation", author);
    draft.setStatus(ArticleStatus.DRAFT);
    draft.getContexts().add(context);
    draft = articles.saveAndFlush(draft);

    mockMvc.perform(get("/contexts/articles/{articleId}", draft.getId()))
            .andExpect(status().isNotFound());
}
```

- [ ] **Step 2: Run the focused Core test and confirm the new contract fails**

Run:

```bash
cd services/core-api
mvn -Dtest=FootballContextControllerIntegrationTest test
```

Expected: FAIL because the endpoints and fixture navigation fields do not exist.

- [ ] **Step 3: Extend the response record with nullable fixture navigation**

Use this exact record shape:

```java
public record FootballContextResponse(
        Long id,
        FootballContextType type,
        String key,
        String displayName,
        String fixtureId,
        String leagueSlug
) {
}
```

- [ ] **Step 4: Add one projection helper and two read methods**

In `FootballContextService`, replace inline context construction with:

```java
@Transactional(readOnly = true)
public List<FootballContextResponse> articleContexts(Long articleId) {
    NewsArticle article = articles.findById(articleId)
            .filter(candidate -> candidate.getStatus() == ArticleStatus.PUBLISHED)
            .orElseThrow(() -> new ResourceNotFoundException("Article not found"));
    return article.getContexts().stream().map(this::toResponse).toList();
}

@Transactional(readOnly = true)
public FootballContextResponse context(Long contextId) {
    return toResponse(contextById(contextId));
}

private FootballContextResponse toResponse(FootballContext context) {
    Fixture fixture = context.getFixture();
    return new FootballContextResponse(
            context.getId(),
            context.getType(),
            context.getContextKey(),
            context.getDisplayName(),
            fixture == null ? null : fixture.getFixtureId(),
            fixture == null ? null : fixture.getLeagueSlug()
    );
}
```

Update `fixtureContext` to call `toResponse(context)`.

- [ ] **Step 5: Expose the public controller methods**

Add:

```java
@GetMapping("/{contextId}")
public ApiResponse<FootballContextResponse> context(@PathVariable Long contextId) {
    return ApiResponse.ok(contexts.context(contextId));
}

@GetMapping("/articles/{articleId}")
public ApiResponse<List<FootballContextResponse>> articleContexts(@PathVariable Long articleId) {
    return ApiResponse.ok(contexts.articleContexts(articleId));
}
```

Import `FootballContextResponse` and `java.util.List`. Do not add a new security matcher; public GET `/contexts/**` is already explicit.

- [ ] **Step 6: Run focused and full Core tests**

Run:

```bash
cd services/core-api
mvn -Dtest=FootballContextControllerIntegrationTest test
mvn test
```

Expected: both commands PASS.

- [ ] **Step 7: Commit the backend context contract**

```bash
git add services/core-api/src/main/java/com/footballverse/context services/core-api/src/test/java/com/footballverse/context/FootballContextControllerIntegrationTest.java
git commit -m "feat: expose context navigation links"
```

---

### Task 3: Connect News and Forum Back to Matchday

**Files:**
- Create: `apps/web/src/features/context/context-links.ts`
- Create: `apps/web/src/features/context/context-links.test.ts`
- Create: `apps/web/src/features/context/context-navigation.tsx`
- Modify: `apps/web/src/features/context/types.ts`
- Modify: `apps/web/src/features/context/api.ts`
- Modify: `apps/web/src/features/news/[slug]/page.tsx`
- Modify: `apps/web/src/features/forum/threads/[slug]/page.tsx`
- Modify: `apps/web/src/features/forum/components/thread-header.tsx`

**Interfaces:**
- Consumes: Task 2's public context endpoints and fixture navigation fields.
- Produces: `contextMatchdayHref(context): string | null`, `useArticleContexts`, `useFootballContext`, and `ContextNavigation` shared by News and Forum.

- [ ] **Step 1: Write the failing pure link tests**

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import { contextMatchdayHref } from "./context-links.ts";

test("builds the canonical Matchday link for a fixture context", () => {
  assert.equal(contextMatchdayHref({
    id: 7,
    type: "FIXTURE",
    key: "fixture/42",
    displayName: "Home vs Away",
    fixtureId: "fixture/42",
    leagueSlug: "premier-league",
  }), "/matchday/fixture%2F42?league=premier-league");
});

test("does not invent a Matchday link for a non-fixture context", () => {
  assert.equal(contextMatchdayHref({
    id: 8,
    type: "CLUB",
    key: "arsenal",
    displayName: "Arsenal",
    fixtureId: null,
    leagueSlug: null,
  }), null);
});
```

- [ ] **Step 2: Run the Web test and confirm it fails**

```bash
cd apps/web
npm test
```

Expected: FAIL because `context-links.ts` does not exist.

- [ ] **Step 3: Extend the Web type and implement the pure link function**

Add nullable fields to `FootballContext`:

```typescript
fixtureId: string | null;
leagueSlug: string | null;
```

Create:

```typescript
import type { FootballContext } from "./types";

export function contextMatchdayHref(context: FootballContext): string | null {
  if (context.type !== "FIXTURE" || !context.fixtureId || !context.leagueSlug) return null;
  return `/matchday/${encodeURIComponent(context.fixtureId)}?league=${encodeURIComponent(context.leagueSlug)}`;
}
```

- [ ] **Step 4: Add typed context queries**

In `context/api.ts`, add:

```typescript
export const useArticleContexts = (articleId: number | null | undefined, enabled = true) =>
  useQuery({
    queryKey: ["context", "article", articleId],
    queryFn: () => data<FootballContext[]>(http.get(`/contexts/articles/${articleId!}`)),
    enabled: enabled && Boolean(articleId),
    staleTime: 120_000,
  });

export const useFootballContext = (contextId: number | null | undefined, enabled = true) =>
  useQuery({
    queryKey: ["context", contextId],
    queryFn: () => data<FootballContext>(http.get(`/contexts/${contextId!}`)),
    enabled: enabled && Boolean(contextId),
    staleTime: 120_000,
  });
```

Import `FootballContext` alongside `FixtureContextResponse`.

- [ ] **Step 5: Build one shared editorial navigation component**

Create `context-navigation.tsx`:

```tsx
import Link from "next/link";
import { contextMatchdayHref } from "./context-links";
import type { FootballContext } from "./types";

export function ContextNavigation({ contexts, label = "Matchday context" }: { contexts: readonly FootballContext[]; label?: string }) {
  const links = contexts.flatMap((context) => {
    const href = contextMatchdayHref(context);
    return href ? [{ context, href }] : [];
  });
  if (!links.length) return null;

  return <nav aria-label={label} className="editorial-panel flex flex-wrap items-center gap-3 px-4 py-3">
    <span className="editorial-kicker m-0">Connected matchday</span>
    {links.map(({ context, href }) => <Link className="min-h-11 inline-flex items-center font-serif-title text-sm font-black text-[var(--color-text-primary)] hover:text-[var(--color-accent)] hover:underline" href={href} key={context.id}>
      {context.displayName} →
    </Link>)}
  </nav>;
}
```

- [ ] **Step 6: Render reverse navigation on News and Forum**

In News Detail, call and render:

```tsx
const { data: articleContexts = [] } = useArticleContexts(article?.id, Boolean(article));

<ContextNavigation contexts={articleContexts ?? []} label="Related matchday" />
```

Place it after the article header/trust block and before related content so the source-backed article remains primary.

In Forum Thread Detail, call:

```tsx
const { data: threadContext } = useFootballContext(thread?.contextId, Boolean(thread?.contextId));
```

Pass `contexts={threadContext ? [threadContext] : []}` to `ThreadHeader`. Extend its props and render the shared component after the category/meta row and before the title:

```tsx
type ThreadHeaderProps = {
  thread: ThreadResponse;
  contexts?: readonly FootballContext[];
  canModerate: boolean;
  onTogglePinned: () => void;
  onToggleLocked: () => void;
};

<ContextNavigation contexts={contexts ?? []} label="Matchday context" />
```

- [ ] **Step 7: Run Web tests, typecheck, and build**

```bash
cd apps/web
npm test
npm run typecheck
npm run build
```

Expected: all commands PASS; no mixed hard-coded route outside `contextMatchdayHref` is introduced by this task.

- [ ] **Step 8: Commit the connected News and Forum navigation**

```bash
git add apps/web/src/features/context apps/web/src/features/news/'[slug]'/page.tsx apps/web/src/features/forum/threads/'[slug]'/page.tsx apps/web/src/features/forum/components/thread-header.tsx
git commit -m "feat: connect stories and threads to matchday"
```

---

### Task 4: Add the Connected Daily Journey to Home

**Files:**
- Create: `apps/web/src/features/home/daily-journey.ts`
- Create: `apps/web/src/features/home/daily-journey.test.ts`
- Create: `apps/web/src/features/home/daily-journey-panel.tsx`
- Modify: `apps/web/src/features/home/page.tsx`

**Interfaces:**
- Consumes: current `MatchCentreFixture`, Task 2's fixture context response, and `useFixtureContext`.
- Produces: `selectFeaturedFixture(fixtures, nowMs)` and a Home section with accessible name `Daily matchday journey`.

- [ ] **Step 1: Write failing selection tests**

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import { selectFeaturedFixture } from "./daily-journey.ts";
import type { MatchCentreFixture } from "@/features/predictions/types";

const fixture = (fixtureId: string, status: string, kickoff: string): MatchCentreFixture => ({
  id: Number(fixtureId.replace(/\D/g, "")) || 1,
  fixtureId,
  league: "premier-league",
  round: "Matchday 1",
  status,
  kickoff,
  homeTeam: "Home",
  awayTeam: "Away",
  homeLogo: "",
  awayLogo: "",
  homeScore: null,
  awayScore: null,
  aiPrediction: null,
  userPrediction: null,
});

test("prefers a live fixture over upcoming fixtures", () => {
  const selected = selectFeaturedFixture([
    fixture("1", "upcoming", "2026-08-17T18:00:00Z"),
    fixture("2", "live", "2026-08-17T16:00:00Z"),
  ], Date.parse("2026-08-17T16:30:00Z"));
  assert.equal(selected?.fixtureId, "2");
});

test("otherwise selects the nearest future fixture", () => {
  const selected = selectFeaturedFixture([
    fixture("3", "upcoming", "2026-08-18T18:00:00Z"),
    fixture("4", "upcoming", "2026-08-17T18:00:00Z"),
  ], Date.parse("2026-08-17T16:30:00Z"));
  assert.equal(selected?.fixtureId, "4");
});
```

- [ ] **Step 2: Run the Web test and confirm it fails**

```bash
cd apps/web
npm test
```

Expected: FAIL because `selectFeaturedFixture` does not exist.

- [ ] **Step 3: Implement deterministic selection**

```typescript
import type { MatchCentreFixture } from "@/features/predictions/types";

export function selectFeaturedFixture(fixtures: readonly MatchCentreFixture[], nowMs = Date.now()): MatchCentreFixture | null {
  const live = fixtures.find((fixture) => fixture.status === "live");
  if (live) return live;
  return fixtures
    .filter((fixture) => fixture.status === "upcoming" && Date.parse(fixture.kickoff) >= nowMs)
    .toSorted((left, right) => Date.parse(left.kickoff) - Date.parse(right.kickoff))[0] ?? null;
}
```

- [ ] **Step 4: Build the focused editorial panel**

Create `daily-journey-panel.tsx` with this public contract:

```tsx
type DailyJourneyPanelProps = {
  fixture: MatchCentreFixture;
  content?: FixtureContextResponse;
  status: "loading" | "error" | "success";
  onRetry: () => void;
};

export function DailyJourneyPanel({ fixture, content, status, onRetry }: DailyJourneyPanelProps) {
  const matchHref = `/matchday/${encodeURIComponent(fixture.fixtureId)}?league=${encodeURIComponent(fixture.league)}`;
  const discussionHref = content ? `/forum?contextId=${content.context.id}&create=1` : "/forum";
  const story = content?.news[0];
  const thread = content?.threads[0];
  return <section aria-label="Daily matchday journey" className="editorial-panel overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
      <div><p className="editorial-kicker m-0">Today&apos;s connected journey</p><h2 className="editorial-section-title m-0 mt-1">{fixture.homeTeam} vs {fixture.awayTeam}</h2></div>
      <Link className="btn btn-primary" href={matchHref}>Open Matchday</Link>
    </div>
    {status === "loading" ? <LoadingBlock label="Loading connected coverage" /> : status === "error" ? <ErrorBlock message="Connected coverage is unavailable. The match remains available." onRetry={onRetry} /> : <div className="grid gap-4 p-5 md:grid-cols-2">
      <div><p className="editorial-kicker m-0">Source-backed story</p>{story ? <Link className="mt-2 block font-serif-title text-lg font-black hover:text-[var(--color-accent)]" href={`/news/${story.slug}`}>{story.title}</Link> : <p className="text-sm text-[var(--color-text-secondary)]">No linked coverage yet.</p>}</div>
      <div><p className="editorial-kicker m-0">Community discussion</p>{thread ? <Link className="mt-2 block font-serif-title text-lg font-black hover:text-[var(--color-accent)]" href={`/forum/threads/${thread.slug}`}>{thread.title}</Link> : <Link className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-[var(--color-accent)]" href={discussionHref}>Start the discussion</Link>}</div>
    </div>}
  </section>;
}
```

Use imports from the existing `state-blocks`, context types, prediction types, and `next/link`. Keep the component under 100 lines.

- [ ] **Step 5: Connect Home without replacing the current hero**

In `home/page.tsx`:

```tsx
const featuredFixture = selectFeaturedFixture(matchdayFixtures);
const featuredContext = useFixtureContext(featuredFixture?.fixtureId, Boolean(featuredFixture));
```

Render `DailyJourneyPanel` immediately after the existing hero/secondary-story section and before the main feed grid. Pass `loading`, `error`, and `success` from the query. Do not remove `MatchdayPulseWidget`; it remains the compact multi-fixture entry point.

- [ ] **Step 6: Run Web verification and the performance budget**

```bash
cd apps/web
npm test
npm run typecheck
npm run build
npm run check:performance
```

Expected: all commands PASS and the existing design tokens remain the only colors used by the new panel.

- [ ] **Step 7: Commit the Home vertical slice**

```bash
git add apps/web/src/features/home
git commit -m "feat: connect the daily hub journey"
```

---

### Task 5: Make Matchday the Canonical Detail Route

**Files:**
- Create: `apps/web/src/features/predictions/routes.ts`
- Create: `apps/web/src/features/predictions/routes.test.ts`
- Modify: `apps/web/src/app/predictions/[fixtureId]/page.tsx`
- Modify: `apps/web/src/features/predictions/detail-page.tsx`

**Interfaces:**
- Consumes: current legacy query keys `league`, `round`, `tab`, and `from`.
- Produces: `canonicalMatchdayHref(fixtureId, searchParams)` and a server-side compatibility redirect.

- [ ] **Step 1: Write failing canonical-route tests**

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import { canonicalMatchdayHref } from "./routes.ts";

test("preserves supported prediction-detail state in the Matchday URL", () => {
  assert.equal(canonicalMatchdayHref("fixture/42", {
    league: "premier-league",
    round: "Regular Season - 1",
    tab: "upcoming",
    from: "fixture/42",
  }), "/matchday/fixture%2F42?league=premier-league&round=Regular+Season+-+1&tab=upcoming&from=fixture%2F42");
});

test("drops unknown query parameters from the compatibility redirect", () => {
  assert.equal(canonicalMatchdayHref("42", { league: "premier-league", next: "https://evil.example" }), "/matchday/42?league=premier-league");
});
```

- [ ] **Step 2: Run the Web test and confirm it fails**

```bash
cd apps/web
npm test
```

Expected: FAIL because the route helper does not exist.

- [ ] **Step 3: Implement an allowlisted canonical URL builder**

```typescript
type SearchValue = string | string[] | undefined;
const retainedKeys = ["league", "round", "tab", "from"] as const;

export function canonicalMatchdayHref(fixtureId: string, searchParams: Record<string, SearchValue> = {}): string {
  const query = new URLSearchParams();
  for (const key of retainedKeys) {
    const value = searchParams[key];
    if (typeof value === "string" && value) query.set(key, value);
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  return `/matchday/${encodeURIComponent(fixtureId)}${suffix}`;
}
```

- [ ] **Step 4: Replace the duplicate page with a server redirect**

Use:

```tsx
import { redirect } from "next/navigation";
import { canonicalMatchdayHref } from "@/features/predictions/routes";

export default async function PredictionDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ fixtureId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ fixtureId }, query] = await Promise.all([params, searchParams]);
  redirect(canonicalMatchdayHref(fixtureId, query));
}
```

- [ ] **Step 5: Keep in-product navigation canonical**

Change the detail page's `returnHref` base from `/predictions` to `/matchday`. Search for user-facing detail links and ensure none target `/predictions/[fixtureId]`:

```bash
rg -n 'href=.*predictions/|`/predictions/|"/predictions/' apps/web/src
```

Expected: no fixture-detail navigation remains; `/predictions` listing links may remain only where intentionally supported.

- [ ] **Step 6: Run Web tests, typecheck, and build**

```bash
cd apps/web
npm test
npm run typecheck
npm run build
```

Expected: all commands PASS and the Next build recognizes the legacy route as a redirecting server page.

- [ ] **Step 7: Commit the canonical route**

```bash
git add apps/web/src/features/predictions/routes.ts apps/web/src/features/predictions/routes.test.ts apps/web/src/app/predictions/'[fixtureId]'/page.tsx apps/web/src/features/predictions/detail-page.tsx
git commit -m "feat: canonicalize matchday detail routes"
```

---

### Task 6: Expose and Render Truthful Fixture Freshness

**Files:**
- Modify: `services/prediction/providers/league_policy.py`
- Test: `services/prediction/tests/test_prediction_service.py`
- Modify: `services/core-api/src/main/java/com/footballverse/prediction/dto/MatchDetailResponse.java`
- Modify: `services/core-api/src/main/java/com/footballverse/prediction/service/MatchCentreService.java`
- Create: `services/core-api/src/test/java/com/footballverse/prediction/MatchCentreSourceAvailabilityTest.java`
- Modify: `apps/web/src/features/predictions/types.ts`
- Create: `apps/web/src/features/predictions/source-freshness.ts`
- Create: `apps/web/src/features/predictions/source-freshness.test.ts`
- Create: `apps/web/src/features/predictions/components/source-freshness.tsx`
- Create: `apps/web/src/features/predictions/components/matchday-hero.tsx`
- Modify: `apps/web/src/features/predictions/detail-page.tsx`

**Interfaces:**
- Consumes: provider `availability` fields already used by match-centre lists.
- Produces: `MatchDetailResponse(fixture, lineups, availability)` and Web `sourceFreshness(availability, fixtureStatus, nowMs)`.

- [ ] **Step 1: Write the failing Prediction contract test**

Import `providers.league_policy as league_policy`, then add:

```python
def test_fixture_detail_preserves_real_provider_availability(monkeypatch):
    provider_payload = {
        "source": "football-data",
        "fixtures": [fixture()],
        "availability": {
            "state": "AVAILABLE",
            "provider": "football-data",
            "season": "2026",
            "fetchedAt": "2026-08-17T10:00:00+00:00",
            "sourceUpdatedAt": "2026-08-17T09:59:00+00:00",
            "retryAfterSeconds": None,
        },
    }
    monkeypatch.setattr(league_policy, "fixtures_payload", lambda _league: provider_payload)

    detail = league_policy.fixture_detail_payload("premier-league", "fixture-1")

    assert detail["availability"] == provider_payload["availability"]
```

- [ ] **Step 2: Run the focused Prediction test and confirm it fails**

```bash
cd services/prediction
python -m pytest -q tests/test_prediction_service.py -k fixture_detail_preserves
```

Expected: FAIL because fixture detail drops `availability`.

- [ ] **Step 3: Preserve provider availability in fixture detail**

Add this field to the existing return dictionary in `fixture_detail_payload`:

```python
"availability": fixtures.get("availability", {
    "state": "PROVIDER_UNAVAILABLE",
    "provider": fixtures.get("source"),
    "season": None,
    "fetchedAt": None,
    "sourceUpdatedAt": None,
    "retryAfterSeconds": None,
}),
```

Run the focused test again; expected PASS.

- [ ] **Step 4: Write the failing Core availability test**

Create a Mockito test that builds a saved-looking `Fixture`, returns a JSON detail containing `fixture`, `lineups`, and `availability`, and asserts the service projection:

```java
@ExtendWith(MockitoExtension.class)
class MatchCentreSourceAvailabilityTest {
    @Mock FixtureRepository fixtures;
    @Mock UserPredictionRepository predictions;
    @Mock PredictionServiceClient client;
    @Mock UserPredictionService userPredictions;
    @Mock FixtureService fixtureService;
    @InjectMocks MatchCentreService service;
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void matchDetailKeepsProviderAndFreshness() throws Exception {
        Fixture fixture = new Fixture();
        fixture.setId(7L);
        fixture.setFixtureId("fixture-1");
        fixture.setLeagueSlug("premier-league");
        fixture.setHomeTeam("Home");
        fixture.setAwayTeam("Away");
        fixture.setKickoff(Instant.parse("2026-08-17T18:00:00Z"));
        when(fixtures.findByFixtureIdAndLeagueSlug("fixture-1", "premier-league")).thenReturn(Optional.of(fixture));
        when(client.fetchFixtureDetail("premier-league", "fixture-1")).thenReturn(json.readTree("""
            {"fixture":{"id":"fixture-1","status":"upcoming","kickoff":"2026-08-17T18:00:00Z","homeTeam":{"name":"Home"},"awayTeam":{"name":"Away"}},"lineups":{"coverage":"AWAITING_OFFICIAL","teams":[],"sourceUpdatedAt":null,"fetchedAt":"2026-08-17T10:00:00Z"},"availability":{"state":"AVAILABLE","provider":"football-data","season":"2026","fetchedAt":"2026-08-17T10:00:00Z","sourceUpdatedAt":"2026-08-17T09:59:00Z","retryAfterSeconds":null}}
            """));

        MatchDetailResponse response = service.matchDetail("premier-league", "fixture-1", null);

        assertThat(response.availability().state()).isEqualTo("AVAILABLE");
        assertThat(response.availability().provider()).isEqualTo("football-data");
        assertThat(response.availability().sourceUpdatedAt()).isEqualTo("2026-08-17T09:59:00Z");
    }
}
```

Add imports for Mockito/JUnit, AssertJ, `ObjectMapper`, `Instant`, and `Optional`. If `Fixture.setId` is unavailable because Lombok excludes it, save the fixture through the mocked contract without setting the ID; this test does not require prediction lookup for an anonymous user.

- [ ] **Step 5: Run the focused Core test and confirm it fails**

```bash
cd services/core-api
mvn -Dtest=MatchCentreSourceAvailabilityTest test
```

Expected: FAIL because `MatchDetailResponse` has no availability field.

- [ ] **Step 6: Project availability through Core**

Change the record to:

```java
public record MatchDetailResponse(
        MatchCentreFixture fixture,
        LineupResponse lineups,
        SourceAvailability availability
) {
}
```

Change the service return to:

```java
return new MatchDetailResponse(
        buildMatchCentreFixture(leagueSlug, fixture, sourceFixture, aiPrediction, userPrediction),
        lineups(detail),
        availability(detail)
);
```

The existing `availability(JsonNode)` already returns `PROVIDER_UNAVAILABLE` when detail or availability is absent; do not fabricate an available state from the database fallback.

- [ ] **Step 7: Write failing Web freshness-policy tests**

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import { sourceFreshness } from "./source-freshness.ts";

const availability = { state: "AVAILABLE" as const, provider: "football-data", season: "2026", fetchedAt: "2026-08-17T10:00:00Z", sourceUpdatedAt: "2026-08-17T09:59:00Z", retryAfterSeconds: null };

test("marks live data delayed after two minutes", () => {
  assert.equal(sourceFreshness(availability, "live", Date.parse("2026-08-17T10:02:01Z")).state, "delayed");
});

test("allows upcoming data for six hours", () => {
  assert.equal(sourceFreshness(availability, "upcoming", Date.parse("2026-08-17T15:59:00Z")).state, "fresh");
});

test("keeps provider unavailability truthful", () => {
  assert.equal(sourceFreshness({ ...availability, state: "PROVIDER_UNAVAILABLE" }, "upcoming", Date.parse("2026-08-17T10:00:00Z")).state, "unavailable");
});
```

- [ ] **Step 8: Implement the pure Web policy and presentation**

Use thresholds of 2 minutes for live, 6 hours for upcoming, and 24 hours for result:

```typescript
import type { SourceAvailability } from "./types";

export type FreshnessState = { state: "fresh" | "delayed" | "unavailable"; provider: string | null; updatedAt: string | null };

export function sourceFreshness(availability: SourceAvailability, status: string, nowMs = Date.now()): FreshnessState {
  if (availability.state !== "AVAILABLE") return { state: "unavailable", provider: availability.provider, updatedAt: availability.sourceUpdatedAt ?? availability.fetchedAt };
  const updatedAt = availability.sourceUpdatedAt ?? availability.fetchedAt;
  if (!updatedAt) return { state: "delayed", provider: availability.provider, updatedAt: null };
  const threshold = status === "live" ? 120_000 : status === "upcoming" ? 21_600_000 : 86_400_000;
  return { state: nowMs - Date.parse(updatedAt) > threshold ? "delayed" : "fresh", provider: availability.provider, updatedAt };
}
```

Extend `MatchDetailResponse` with `availability: SourceAvailability`. Create a presentation component that calls this function and renders exactly one token-based status line:

```tsx
export function SourceFreshness({ availability, status }: { availability: SourceAvailability; status: string }) {
  const freshness = sourceFreshness(availability, status);
  const label = freshness.state === "fresh" ? "Source data current" : freshness.state === "delayed" ? "Source data delayed" : "Live source unavailable";
  return <p aria-live="polite" className="m-0 text-xs font-semibold text-[var(--color-text-secondary)]">
    {label}{freshness.provider ? ` · ${freshness.provider}` : ""}{freshness.updatedAt ? ` · ${formatDate(freshness.updatedAt, { dateStyle: "medium", timeStyle: "short" })}` : ""}
  </p>;
}
```

Extract the current hero markup from `detail-page.tsx` into `matchday-hero.tsx` instead of making the already-large page larger. Use this exact public interface:

```tsx
type MatchdayHeroProps = {
  fixture: MatchCentreFixture;
  availability: SourceAvailability;
  kickoffLabel: string;
  scoreLabel: string;
  statusLabel: string;
};
```

Move the existing `prediction-detail` section markup without changing its classes or visual hierarchy, render `SourceFreshness` directly below the score/status row, and replace the old inline section with:

```tsx
<MatchdayHero
  availability={data.availability}
  fixture={fixture}
  kickoffLabel={formatKickoff(fixture.kickoff, timezone)}
  scoreLabel={score(fixture)}
  statusLabel={statusLabel(fixture)}
/>
```

Do not use animated “live” styling when freshness state is delayed or unavailable.

- [ ] **Step 9: Run all narrow and service-local tests**

```bash
cd services/prediction
python -m pytest -q
cd ../core-api
mvn test
cd ../../apps/web
npm test
npm run typecheck
npm run build
```

Expected: every command PASS.

- [ ] **Step 10: Commit the end-to-end provenance contract**

```bash
git add services/prediction services/core-api/src/main/java/com/footballverse/prediction services/core-api/src/test/java/com/footballverse/prediction/MatchCentreSourceAvailabilityTest.java apps/web/src/features/predictions
git commit -m "feat: expose matchday source freshness"
```

---

### Task 7: Expand the Daily-Loop Acceptance Smoke and Close Phase 1

**Files:**
- Modify: `apps/web/tests/daily-loop.browser.test.ts`
- Modify: `scripts/daily_loop_smoke.py`
- Modify: `docs/case-studies/daily-matchday.md`
- Modify: `docs/runbooks/baseline-verification.md`

**Interfaces:**
- Consumes: every Task 2–6 contract and the disposable Core database setup already owned by `daily_loop_smoke.py`.
- Produces: one deterministic browser journey proving Home → Matchday → News → Matchday → Forum → Matchday, legacy redirect behavior, graceful context failure, and cleanup.

- [ ] **Step 1: Add browser-only provider responses to the smoke environment**

Keep Core context/news/forum requests real. In the browser test, before the first navigation, fulfill only the two provider-facing Core browser calls:

```typescript
const availability = { state: "AVAILABLE", provider: "smoke-recording", season: "2026", fetchedAt: new Date().toISOString(), sourceUpdatedAt: new Date().toISOString(), retryAfterSeconds: null };
const fixture = { id: 1, fixtureId, league: "premier-league", round: "Daily smoke", status: "upcoming", kickoff: new Date(Date.now() + 86_400_000).toISOString(), homeTeam: "Smoke Home", awayTeam: "Smoke Away", homeLogo: "", awayLogo: "", homeScore: null, awayScore: null, aiPrediction: null, userPrediction: null };

await page.route("**/predictions/match-centre?**", async (route) => {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { league: "premier-league", round: null, fixtures: [fixture], standings: [], rounds: [], currentRound: null, fixturesAvailability: availability, standingsAvailability: availability, roundsAvailability: availability } }) });
});
await page.route(`**/predictions/match-centre/${encodeURIComponent(fixtureId)}?**`, async (route) => {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { fixture, lineups: { coverage: "AWAITING_OFFICIAL", sourceUpdatedAt: null, fetchedAt: availability.fetchedAt, teams: [] }, availability } }) });
});
```

Use the database-provided fixture home/away labels from new environment variables rather than hard-coding them. Add `DAILY_LOOP_HOME_TEAM` and `DAILY_LOOP_AWAY_TEAM` in `run_browser`; populate them from `DailyLoopData` by adding `home_team` and `away_team` fields returned by `create_data`.

- [ ] **Step 2: Extend the journey assertions**

After login:

```typescript
await page.goto(webUrl, { waitUntil: "domcontentloaded" });
await page.getByRole("region", { name: "Daily matchday journey" }).waitFor();
await page.getByRole("link", { name: "Open Matchday" }).click();
await page.waitForURL((url) => url.pathname === `/matchday/${fixtureId}`);

await page.getByRole("link", { name: storyTitle }).click();
await page.getByRole("heading", { name: storyTitle }).waitFor();
await page.getByRole("navigation", { name: "Related matchday" }).getByRole("link").click();
await page.waitForURL((url) => url.pathname === `/matchday/${fixtureId}`);

await page.getByRole("link", { name: threadTitle }).click();
await page.getByRole("heading", { name: threadTitle }).waitFor();
await page.getByRole("navigation", { name: "Matchday context" }).getByRole("link").click();
await page.waitForURL((url) => url.pathname === `/matchday/${fixtureId}`);

await page.goto(`${webUrl}/predictions/${encodeURIComponent(fixtureId)}?league=premier-league`, { waitUntil: "domcontentloaded" });
await page.waitForURL((url) => url.pathname === `/matchday/${fixtureId}` && url.searchParams.get("league") === "premier-league");
```

Retain the existing thread-creation, context-error, retry, honest-empty-state, and cleanup assertions.

- [ ] **Step 3: Run the deterministic integrated smoke**

Run the repository's existing integrated-smoke entry point documented by `scripts/verify.ps1`; do not point it at development data:

```powershell
./scripts/verify.ps1 -IntegratedSmokeOnly
```

Expected: Daily Matchday context, browser, and cleanup checks all PASS. Inspect the disposable project name before any manual cleanup; never remove a broad Docker volume or development container.

- [ ] **Step 4: Run the full final verification matrix**

```powershell
./scripts/verify.ps1
```

Expected final line: `All verification steps passed.`.

- [ ] **Step 5: Update evidence without overstating deployment**

In `docs/case-studies/daily-matchday.md`, record:

- the canonical Matchday redirect;
- reverse navigation from source-backed stories and context-linked threads;
- the connected Home journey;
- the provider/freshness contract;
- the exact smoke command and result;
- the limitation that provider HTTP reachability is not proven by deterministic browser interception;
- the fact that full Vietnamese/English routing belongs to Phase 3.

In `docs/runbooks/baseline-verification.md`, update test counts only from the final command output. Do not replace a missing prerequisite with “pass” and do not claim public deployment.

- [ ] **Step 6: Check docs, status, and final diff**

```bash
git diff --check
git status --short
git diff --stat HEAD~6..HEAD
```

Expected: no whitespace errors; `.superpowers/` remains unstaged; the diff is limited to this Phase 1 plan.

- [ ] **Step 7: Commit Phase 1 acceptance evidence**

```bash
git add apps/web/tests/daily-loop.browser.test.ts scripts/daily_loop_smoke.py docs/case-studies/daily-matchday.md docs/runbooks/baseline-verification.md
git commit -m "test: verify the connected daily hub loop"
```

---

## Reviewer Gate After Every Task

The implementing agent must stop after each task and provide:

1. commit SHA and exact files changed;
2. failing-test output observed before implementation;
3. passing-test output observed after implementation;
4. any deviation from the interfaces in this plan;
5. `git status --short` output showing no accidental staging.

The reviewer checks, in order:

- spec compliance and scope;
- no fabricated runtime data;
- preservation of the existing visual identity;
- API/type agreement across Python, Core, and Web;
- test quality and negative/error coverage;
- verification evidence from fresh command output.

Do not begin the next task until the reviewer accepts the current task or sends a concrete fix list.
