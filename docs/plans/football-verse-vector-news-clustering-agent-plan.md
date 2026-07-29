# Football Verse — Automated Vector News Clustering Implementation Plan

> Agent-ready technical specification  
> Scope: News ingestion, raw items, aggregated stories, clustering, observability, tests  
> Explicitly out of scope: `services/career`, match engine, career UI and career database

---

## 1. Objective

Replace the current token/Jaccard-based story grouping algorithm with a reliable, observable, versioned **hybrid semantic clustering pipeline**.

When a new football news item is collected:

1. Normalize the item.
2. Generate a semantic embedding.
3. Search recent aggregated stories for semantically similar candidates.
4. Apply hard safety guards and hybrid scoring.
5. Either attach the item to an existing story, send it to review, or create a new story.
6. Record the decision and scores for later tuning.

The primary product goal is:

> Multiple publications covering the same real-world football event should appear as one story with multiple sources, without merging different events that merely share a club, player, competition, or generic transfer vocabulary.

---

## 2. Current implementation and why it performs poorly

Current clustering is implemented in:

```text
services/core-api/src/main/java/com/footballverse/news/service/RawItemImportService.java
```

The current algorithm:

- reads at most 200 published aggregated stories;
- uses a 48-hour window;
- tokenizes title and description;
- applies custom stemming;
- assigns a broad event type using keyword matching;
- calculates Jaccard token overlap;
- merges when score is at least `0.50`.

Conceptually:

```text
incoming title/description
        |
        v
keyword event type
        |
        v
token set + crude stemming
        |
        v
Jaccard overlap against 200 stories
        |
        +-- score >= 0.50 --> merge
        |
        +-- otherwise ------> new story
```

### Main failure modes

#### False split

These describe the same event but use different vocabulary:

```text
Manchester United reach agreement for João Neves
Red Devils close in on Benfica midfielder after talks progress
```

Token overlap may be too low even though the meaning is nearly identical.

#### False merge

These share entities and football vocabulary but are different events:

```text
Liverpool interested in Player A
Liverpool complete signing of Player B
```

```text
Arsenal prepare bid for Player A
Chelsea agree terms with Player A
```

#### Weak event classification

The existing event families are only:

```text
RUMOUR
TRANSFER
INJURY
MATCH
OTHER
```

A word such as `transfer`, `signing`, `score`, or `injury` is not sufficient to identify a real-world event.

#### Candidate truncation

Only the latest 200 stories in the time window are inspected. Relevant stories can be missed during high-volume periods.

#### No calibration data

The merge threshold is hard-coded without:

- labelled positive and negative pairs;
- precision/recall evaluation;
- decision logs;
- manual merge/split feedback;
- model or algorithm versioning.

#### Race condition

Two similar items arriving at nearly the same time can both find no candidate and create two separate stories.

---

## 2.1 Binding review decisions

The implementation must follow these decisions; they resolve assumptions that were invalid in the original plan.

- Core deploys a dual V1/V2 reader before Ingestion emits V2. The worker routes every recognized normalized version to `/internal/news/raw-items`; it must not use `schemaVersion === 1` as the routing rule.
- Reuse the existing durable Ingestion spool. Persist the normalized payload and checkpoint first; on claim, embed and strictly validate it, atomically replace the payload with V2, then use the existing delivery path. Do not add an embedding job table or separate retry state in Phase 0.
- Phase 0 keeps one active model revision. A story profile is keyed by `story_id`; model/revision changes require an explicit re-embedding/backfill cutover before vector mode is enabled. Never compare vectors across revisions.
- PostgreSQL+pgvector integration tests are mandatory. H2 is retained only for non-vector unit/regression tests.
- Semantic membership is not corroboration. A clustered secondary source is `CONTEXT` until claim-level verification proves support or contradiction; membership count alone must not promote a public verification status.
- A durable Core clustering queue is out of Phase 0. Until it exists, a candidate-retrieval failure rolls back the import and relies on the existing Ingestion spool retry budget. `REVIEW_REQUIRED` requires a visible Core/admin workflow and must not be represented only by a spool `SKIPPED` state.

---

## 3. Architecture decision

Use a **hybrid, two-stage clustering system**:

```text
                  CONTENT INGESTION
New raw metadata --------------------------+
                                           |
                                  batch embedding
                                           |
                                           v
                           NormalizedItem schema v2
                           + embedding
                           + model/version
                                           |
                                           v
                                      CORE API
                                           |
                             exact duplicate checks
                                           |
                                           v
                           vector candidate retrieval
                                           |
                                           v
                    hard guards + hybrid reranking
                                           |
                    +----------------------+------------------+
                    |                      |                  |
                 auto merge          review/LLM check     new story
                    |                      |                  |
                    +----------------------+------------------+
                                           |
                                           v
                           audit decision + metrics
```

### Chosen boundaries

#### Content Ingestion owns embedding generation

`services/content-ingestion` already owns collection and normalization. It persists normalized payloads before embedding; the claiming worker generates and validates embeddings before sending V2 items to Core.

Benefits:

- no external model call inside a Core database transaction;
- embeddings can be generated in batches;
- the existing spool preserves retry semantics across worker crashes and delivery retries;
- Core remains the source of truth for story ownership and cluster decisions;
- no new public API is introduced.

#### Core API owns clustering

Core owns raw items, stories, story membership, source counts, verification status, cluster decisions, merge and split operations.

#### PostgreSQL owns vector retrieval

Use `pgvector` in the existing Core PostgreSQL database. Do not introduce a separate vector database for this workload.

---

## 4. Embedding implementation

### 4.1 Provider abstraction

Create an interface inside Content Ingestion:

```ts
export interface EmbeddingProvider {
  readonly modelId: string;
  readonly modelVersion: string;
  readonly dimensions: number;

  embed(texts: string[]): Promise<number[][]>;
}
```

Initial implementations:

```text
LocalTransformersEmbeddingProvider
DisabledEmbeddingProvider
```

Future optional implementations:

```text
GoogleEmbeddingProvider
OpenAIEmbeddingProvider
RemoteInternalEmbeddingProvider
```

The clustering contract must not depend on a vendor-specific response.

### 4.2 Recommended local model

Initial recommendation:

```text
intfloat/multilingual-e5-small
dimension: 384
distance: cosine
```

Reasons:

- multilingual;
- suitable for semantic similarity and clustering;
- supports English now and future Vietnamese/Japanese content;
- small enough for a CPU-based ingestion workload;
- MIT-licensed model;
- compatible with sentence-transformer/ONNX workflows.

For E5 clustering, construct all inputs consistently using the model-required symmetric-task prefix:

```text
query: <normalized clustering text>
```

Do not mix `query:` and `passage:` for items being compared symmetrically.

### 4.3 Run inside Content Ingestion

Use server-side `@huggingface/transformers` feature extraction in Node.js.

Add:

```text
services/content-ingestion/src/embedding/
├── embedding-provider.ts
├── local-transformers-provider.ts
├── disabled-provider.ts
├── embedding-text.ts
└── embedding-batch.ts
```

Load the model once during worker startup. Do not reload it for every item or crawl cycle.

Do not approve this provider until CI proves the pinned model and ONNX runtime work in the production container base image. The current image is Alpine and does not include model assets; Phase 0 keeps `DisabledEmbeddingProvider` available and must not permit runtime model downloads in production.

### 4.4 Production model packaging

Production must not download the model dynamically on first request.

Use one controlled approach:

1. Bake the ONNX model into the Content Ingestion image.
2. Download and verify the model during image build.
3. Mount a read-only model volume prepared during deployment.

Required controls:

- pin model revision or commit;
- record model ID and revision in every embedded item;
- verify expected dimension;
- disable remote model fetching in production;
- apply maximum input length;
- apply batch-size and concurrency limits.

### 4.5 Embedding text

Do not embed full scraped article HTML.

Use a stable canonical representation:

```text
query:
title: <plain normalized title>
summary: <plain normalized description, max bounded length>
publisher: <publisher name>
language: <language code>
```

Recommended construction:

```ts
function buildClusteringText(item: NormalizedItemV2): string {
  return [
    "query:",
    `title: ${normalize(item.title)}`,
    `summary: ${normalize(item.description ?? "").slice(0, 1800)}`,
    `publisher: ${normalize(item.publisherName ?? "")}`,
    `language: ${item.language ?? "unknown"}`,
  ].join("\n");
}
```

Do not include URLs, tracking parameters, boilerplate, full HTML, comments, source trust score or the current story title.

### 4.6 Normalize vectors

The provider must return normalized finite vectors:

```text
length = 384
no NaN
no Infinity
L2 norm approximately 1
```

Reject malformed output before it reaches Core.

---

## 5. Contract changes

Create `NormalizedItemV2`.

Example:

```json
{
  "schemaVersion": 2,
  "idempotencyKey": "...",
  "revisionFingerprint": "...",
  "connectorId": 12,
  "provider": "rss",
  "title": "Manchester United reach agreement...",
  "description": "...",
  "language": "en",
  "publishedAt": "2026-07-29T04:00:00Z",
  "collectedAt": "2026-07-29T04:03:00Z",
  "embedding": {
    "model": "intfloat/multilingual-e5-small",
    "revision": "<pinned-model-revision>",
    "dimensions": 384,
    "vector": [0.0123, -0.0042]
  }
}
```

### Rollout compatibility

Core must temporarily accept both schema v1 and v2:

```text
v2 with valid embedding -> vector pipeline
v1 or missing embedding -> conservative legacy fallback or review
invalid v2 embedding     -> reject contract, do not create a story
```

Do not silently accept a malformed vector as an empty vector.

Deployment order is mandatory:

1. Deploy Core with V1/V2 dual-reader and V2 validation while mode remains `legacy`.
2. Deploy Ingestion with explicit normalized-schema routing and V2 payload enrichment in the spool claim path.
3. Enable `vector-shadow` only after the PostgreSQL+pgvector integration lane and baseline checks pass.

Routing and validation tests must prove that V1 remains unchanged, V2 reaches raw-item import, and invalid V2 causes no raw item or story side effect.

---

## 6. PostgreSQL and pgvector

### 6.1 Docker image

The current Core database uses standard `postgres:16-alpine`.

Replace only the Core/shared PostgreSQL image with a pinned pgvector PostgreSQL 16 image. Do not change `match-game-postgres`.

Keep image digest pinning consistent with the repository's existing policy.

### 6.2 Migration

Create a new Flyway migration using the next available migration number.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE raw_items
    ADD COLUMN embedding vector(384),
    ADD COLUMN embedding_model VARCHAR(160),
    ADD COLUMN embedding_revision VARCHAR(120),
    ADD COLUMN embedded_at TIMESTAMPTZ,
    ADD COLUMN cluster_status VARCHAR(32) NOT NULL DEFAULT 'PENDING';

CREATE TABLE story_cluster_profiles (
    story_id BIGINT PRIMARY KEY REFERENCES news_articles(id) ON DELETE CASCADE,
    centroid vector(384) NOT NULL,
    model VARCHAR(160) NOT NULL,
    model_revision VARCHAR(120) NOT NULL,
    member_count INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_story_cluster_member_count CHECK (member_count > 0)
);

ALTER TABLE story_items
    ADD COLUMN semantic_score NUMERIC(6,5),
    ADD COLUMN lexical_score NUMERIC(6,5),
    ADD COLUMN final_cluster_score NUMERIC(6,5),
    ADD COLUMN cluster_method VARCHAR(40),
    ADD CONSTRAINT chk_story_items_semantic_score
        CHECK (semantic_score IS NULL OR semantic_score BETWEEN 0 AND 1),
    ADD CONSTRAINT chk_story_items_lexical_score
        CHECK (lexical_score IS NULL OR lexical_score BETWEEN 0 AND 1),
    ADD CONSTRAINT chk_story_items_final_cluster_score
        CHECK (final_cluster_score IS NULL OR final_cluster_score BETWEEN 0 AND 1);

CREATE TABLE cluster_decisions (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    raw_item_id BIGINT NOT NULL REFERENCES raw_items(id),
    selected_story_id BIGINT REFERENCES news_articles(id),
    action VARCHAR(32) NOT NULL,
    model VARCHAR(160),
    model_revision VARCHAR(120),
    semantic_score NUMERIC(6,5),
    lexical_score NUMERIC(6,5),
    entity_score NUMERIC(6,5),
    time_score NUMERIC(6,5),
    final_score NUMERIC(6,5),
    reason_code VARCHAR(80) NOT NULL,
    candidate_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_articles_cluster_window
    ON news_articles(last_source_at DESC)
    WHERE status = 'PUBLISHED'
      AND content_kind = 'AGGREGATED_STORY';

CREATE INDEX idx_cluster_decisions_raw_item ON cluster_decisions(raw_item_id);
CREATE INDEX idx_cluster_decisions_story ON cluster_decisions(selected_story_id);
```

Phase 1 supports one active model/revision only. `story_cluster_profiles.story_id` remains the primary key; model/revision fields must match the Core allow-list. A future concurrent-model rollout may replace this with `(story_id, model, model_revision)`, but that is not part of this migration.

The pgvector image and extension privilege must be proven against a copy of an existing database volume before rollout. The application role must not be assumed to have permission to run `CREATE EXTENSION`.

### 6.3 Exact search first

For the first version, use exact cosine search over only stories active in the last 24 hours.

This candidate set should be small enough and exact search gives deterministic, full-recall results. Do not add HNSW merely because pgvector supports it.

Future optional index:

```sql
CREATE INDEX idx_story_cluster_centroid_hnsw
    ON story_cluster_profiles
    USING hnsw (centroid vector_cosine_ops);
```

### 6.4 Candidate query

Use a native query/JDBC repository:

```sql
SELECT
    article.id AS story_id,
    1 - (profile.centroid <=> CAST(:embedding AS vector)) AS semantic_score,
    article.last_source_at
FROM story_cluster_profiles profile
JOIN news_articles article ON article.id = profile.story_id
WHERE article.content_kind = 'AGGREGATED_STORY'
  AND article.status = 'PUBLISHED'
  AND article.last_source_at >= :window_start
  AND article.last_source_at <= :window_end
  AND profile.model = :model
  AND profile.model_revision = :model_revision
ORDER BY profile.centroid <=> CAST(:embedding AS vector)
LIMIT :candidate_limit;
```

Initial values:

```text
window_start = item event time - 24 hours
window_end   = item event time + 2 hours
candidate_limit = 20
```

Use item `publishedAt`; fall back to `discoveredAt`.

---

## 7. Hybrid cluster decision

Vector similarity is not sufficient to decide that two articles describe the same event.

Use it for candidate retrieval, then apply a guarded decision.

### 7.1 Decision order

```text
1. Same identity key/revision?
2. Same canonical URL hash?
3. Existing raw item membership?
4. Retrieve vector candidates.
5. Apply hard incompatibility rules.
6. Calculate hybrid score.
7. Auto merge, review, or create.
8. Persist decision log.
```

### 7.2 Hard incompatibility rules

Reject a candidate before scoring when any reliable conflict is present.

Examples:

- match result vs transfer;
- injury vs manager appointment;
- lineup vs transfer;
- two match reports with different team pairs or dates;
- transfer destinations conflict;
- item is outside the allowed event window;
- embedding model/revision differs;
- candidate is deleted, archived or merged elsewhere.

Unknown metadata should require a stricter semantic threshold.

### 7.3 Event families

Replace the current broad keyword types with a typed enum:

```text
TRANSFER_RUMOUR
TRANSFER_INTEREST
TRANSFER_BID
TRANSFER_AGREEMENT
TRANSFER_MEDICAL
TRANSFER_OFFICIAL
TRANSFER_DENIAL
INJURY
INJURY_UPDATE
MATCH_PREVIEW
LINEUP
MATCH_LIVE
MATCH_RESULT
MANAGER_APPOINTMENT
MANAGER_SACKING
CONTRACT_RENEWAL
DISCIPLINARY
CLUB_FINANCE
GENERAL
UNKNOWN
```

For MVP, event-family extraction may remain deterministic, but isolate it behind:

```java
public interface EventClassifier {
    ClassifiedEvent classify(RawItem item);
}
```

Do not bury event classification inside `RawItemImportService`.

### 7.4 Entity fingerprint

Add a lightweight structured fingerprint:

```json
{
  "players": ["joao-neves"],
  "clubs": ["manchester-united", "benfica"],
  "competitions": [],
  "fixtureDate": null,
  "relationship": "benfica->manchester-united"
}
```

MVP sources:

- normalized title and summary;
- known club dictionary and aliases;
- known competition dictionary;
- capitalized name candidates;
- optional provider metadata.

Do not depend on an LLM for first-version entity extraction.

### 7.5 Scoring

Initial formula:

```text
finalScore =
    semanticScore * 0.75
  + lexicalScore  * 0.10
  + entityScore   * 0.10
  + timeScore     * 0.05
```

Store weights in configuration:

```yaml
app:
  clustering:
    mode: vector-shadow
    window-hours: 24
    candidate-limit: 20
    semantic-weight: 0.75
    lexical-weight: 0.10
    entity-weight: 0.10
    time-weight: 0.05
```

These weights are initial configuration, not permanent truth.

### 7.6 Initial decision bands

Do not hard-code final production thresholds without evaluation.

Initial shadow-mode bands:

```text
AUTO_MERGE:
  semantic >= 0.90
  compatible event/entity guards
  final >= 0.88

BORDERLINE:
  semantic >= 0.82
  final >= 0.80

NEW_STORY:
  below borderline threshold
  or any hard incompatibility
```

For unknown event/entity data:

```text
require semantic >= 0.93 for auto merge
otherwise create/review
```

E5 scores commonly occupy a high range. Calibrate thresholds on Football Verse data rather than copying generic examples.

### 7.7 Optional AI adjudicator

Only use an LLM for the highest-scoring borderline candidate.

Strict response:

```json
{
  "decision": "SAME_EVENT | DIFFERENT_EVENT | UNCERTAIN",
  "confidence": 0.0,
  "reasonCode": "..."
}
```

Rules:

- no free-form merge mutation;
- timeout and daily quota;
- record model and response;
- `UNCERTAIN` must not auto-merge;
- provider failure favors a new story/review;
- never call the LLM inside the database transaction.

---

## 8. Story centroid lifecycle

### New story

```text
centroid = raw item embedding
memberCount = 1
model/revision = raw item model/revision
```

### Merge

After attaching a raw item:

1. insert `story_items`;
2. recompute centroid from member raw-item embeddings;
3. update member count;
4. update source count and verification;
5. record the cluster decision.

Use PostgreSQL `AVG(vector)`:

```sql
UPDATE story_cluster_profiles profile
SET centroid = aggregate.centroid,
    member_count = aggregate.member_count,
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT
        membership.story_id,
        AVG(item.embedding) AS centroid,
        COUNT(*) AS member_count
    FROM story_items membership
    JOIN raw_items item ON item.id = membership.raw_item_id
    WHERE membership.story_id = :storyId
      AND item.embedding IS NOT NULL
      AND item.embedding_model = :model
      AND item.embedding_revision = :revision
    GROUP BY membership.story_id
) aggregate
WHERE profile.story_id = aggregate.story_id;
```

Cosine distance is norm-aware, so an averaged centroid may be used without manually storing a unit vector.

### Raw-item revision

When an existing raw item receives a meaningful revision:

1. regenerate embedding when clustering text changed;
2. preserve membership initially;
3. recompute story centroid;
4. detect a large similarity drop;
5. enqueue re-evaluation instead of silently moving it during import.

---

## 9. Concurrency and transaction safety

Embedding must already exist before Core starts the cluster transaction.

```text
BEGIN
  acquire clustering advisory lock
  persist/update raw item
  exact/canonical checks
  vector candidate search
  guarded decision
  create story or attach item
  update centroid
  write cluster decision
COMMIT
```

For initial volume, use a short global PostgreSQL advisory transaction lock around only cluster decision:

```sql
SELECT pg_advisory_xact_lock(hashtext('football-verse-news-clustering'));
```

This prevents two near-simultaneous items from independently creating duplicate stories.

Later replace the global lock with a sharded lock if throughput requires it.

Do not hold the lock while downloading, parsing, embedding, calling Gemini, calling Telegram or contacting providers.

The current Telegram call enqueues a durable outbox record, so that database write may remain in the import transaction; delivery must happen after commit. Gemini summary generation currently happens inside the import transaction and must move to post-commit enrichment (or a deterministic fallback) before the advisory lock/vector-authoritative phase.

Before adding a uniqueness constraint on `story_items.raw_item_id`, make the product rule explicit and repair existing data: either a raw item belongs to exactly one event story and manual split moves membership, or roundups may support multiple stories and `findFirstByRawItem` cannot be treated as an invariant.

---

## 10. Failure handling

### Embedding unavailable

Do not immediately publish every unembedded item as a separate story.

```text
embedding failed
    |
    +-- retry with bounded backoff
    |
    +-- after retry budget:
           REVIEW_REQUIRED
           or conservative lexical fallback
```

Configuration:

```text
EMBEDDING_MAX_ATTEMPTS
EMBEDDING_RETRY_BASE_MS
EMBEDDING_BATCH_SIZE
EMBEDDING_CONCURRENCY
CLUSTER_ALLOW_LEGACY_FALLBACK
```

Recommended default:

```text
CLUSTER_ALLOW_LEGACY_FALLBACK=false
```

If fallback is enabled, log:

```text
cluster_method = LEXICAL_FALLBACK
```

### Model revision mismatch

Never compare vectors generated by different model revisions.

Keep one active revision in Phase 1. Leave mismatched vectors out of vector retrieval and require an explicit active-window re-embedding/backfill cutover before changing the allow-list.

### Bad vector

Reject wrong dimension, NaN, Infinity, near-zero vector or missing model metadata.

### Candidate retrieval failure

In Phase 1, roll back the import and let the existing durable Ingestion spool retry. Do not create a new public story merely because vector retrieval failed. A later durable Core clustering processor is required before claiming a Core-owned retryable raw-item state.

---

## 11. Clustering modes

Support:

```text
legacy
vector-shadow
vector
off
```

### `legacy`

Current algorithm, temporary compatibility only.

### `vector-shadow`

- run vector decision;
- run current decision;
- apply current decision only;
- record both results;
- expose disagreement metrics.

### `vector`

Vector/hybrid decision is authoritative. Legacy score remains optional diagnostic input.

### `off`

Raw items remain pending/review and no public story is created automatically.

---

## 12. Observability

### Phase 1 logs-first baseline

The repository does not yet have a metrics exporter. Start with bounded structured decision logs and counters (action, reason code, mode and allow-listed model revision only); never log vectors or article bodies. Add Prometheus/OpenTelemetry instrumentation only with an explicit exporter and deployment contract.

### Metrics

```text
embedding_batch_duration_seconds
embedding_items_total
embedding_failures_total
embedding_queue_depth
cluster_decisions_total{action,method}
cluster_semantic_score
cluster_final_score
cluster_candidate_count
cluster_decision_duration_seconds
cluster_shadow_disagreements_total
cluster_review_backlog
cluster_manual_split_total
cluster_manual_merge_total
```

### Decision reason codes

```text
EXACT_SOURCE_URL
EXACT_CANONICAL_URL
VECTOR_HIGH_CONFIDENCE
VECTOR_ENTITY_SUPPORTED
VECTOR_BORDERLINE
EVENT_TYPE_CONFLICT
ENTITY_RELATIONSHIP_CONFLICT
OUTSIDE_TIME_WINDOW
MODEL_VERSION_MISMATCH
NO_CANDIDATE
EMBEDDING_UNAVAILABLE
LEGACY_FALLBACK
MANUAL_MERGE
MANUAL_SPLIT
```

### Structured logs

Include request ID, raw item ID, candidate story ID, action, all scores, model/revision, reason code and duration.

Do not log complete vectors or article bodies.

---

## 13. Quality evaluation

Build a labelled dataset before enabling authoritative vector mode.

### Dataset

At minimum:

```text
300–500 labelled item pairs
```

Include:

- same event with paraphrased titles;
- same event across languages;
- same club, different player;
- same player, different destination club;
- same clubs, different match dates;
- rumour progressing to agreement/official;
- same-source correction;
- generic transfer roundups;
- multi-event list articles;
- old story outside the 24-hour window;
- conflicting reports.

Labels:

```text
SAME_EVENT
DIFFERENT_EVENT
UNCERTAIN
```

False merges are more harmful than false splits.

Initial quality targets:

```text
auto-merge precision >= 98%
same-event recall >= 90%
zero known hard-conflict merges
```

Create:

```text
scripts/evaluate_news_clustering.py
```

Output precision, recall, F1, false merges, false splits, score distribution and recommended thresholds.

Store a versioned report in:

```text
docs/architecture/news-clustering-baseline-YYYY-MM-DD.json
```

---

## 14. Admin correction workflow

Add:

```text
/admin/news/clusters
```

Capabilities:

- inspect recent decisions;
- compare incoming item and selected story;
- view candidate scores;
- label same/different event;
- filter borderline decisions;
- export labelled pairs.

Phase 3 is read-only. It exists to create a reliable labelled dataset and to make shadow decisions reviewable; vectors, full article bodies and raw provider secrets remain unavailable to the public API.

Manual merge and split are a later controlled-write phase. Before exposing either command, define paginated admin DTOs, RBAC, target IDs, expected revision/optimistic concurrency, idempotency, audit responses and atomic recomputation semantics.

### Manual merge must

1. move memberships;
2. avoid duplicate membership;
3. recompute centroid;
4. recompute source count;
5. recompute verification;
6. mark/redirect the losing story;
7. record `MANUAL_MERGE`.

### Manual split must

1. create a new story from selected raw items;
2. recompute both centroids;
3. recompute primary sources;
4. recompute source counts and verification;
5. record `MANUAL_SPLIT`.

Manual corrections should feed the evaluation dataset.

---

## 15. Refactor plan

### Core API

Create:

```text
services/core-api/src/main/java/com/footballverse/news/clustering/
├── StoryClusteringService.java
├── ClusterCandidateRepository.java
├── ClusterDecisionRepository.java
├── ClusterScorer.java
├── EventClassifier.java
├── RuleBasedEventClassifier.java
├── EntityFingerprintExtractor.java
├── ClusterConfiguration.java
├── ClusterCandidate.java
├── ClusterDecision.java
└── ClusterReasonCode.java
```

Refactor `RawItemImportService`.

Keep:

- contract validation;
- idempotency;
- source validation;
- raw-item persistence;
- projection orchestration.

Remove:

- `findCluster`;
- `match`;
- embedded token/event scoring;
- direct threshold logic.

Delegate:

```java
ClusterDecision decision = storyClusteringService.decide(savedRawItem);
```

### Content Ingestion

Modify:

```text
services/content-ingestion/package.json
services/content-ingestion/Dockerfile
services/content-ingestion/src/contracts/normalized-item.ts
services/content-ingestion/src/worker.ts
services/content-ingestion/src/spool.ts
services/content-ingestion/src/adapters/*
```

Add:

```text
services/content-ingestion/src/embedding/*
```

Batch-embed adapter results before enqueueing normalized items.

### Database

Modify:

```text
docker-compose.yml
infra/postgres/init/*
services/core-api/src/main/resources/db/migration/VXX__vector_story_clustering.sql
```

### Tests

Add:

```text
services/content-ingestion/test/embedding-text.test.ts
services/content-ingestion/test/embedding-provider.test.ts
services/content-ingestion/test/embedding-batch.test.ts

services/core-api/src/test/java/com/footballverse/news/clustering/
├── ClusterScorerTest.java
├── RuleBasedEventClassifierTest.java
├── EntityFingerprintExtractorTest.java
├── StoryClusteringIntegrationTest.java
├── StoryClusteringConcurrencyTest.java
└── ClusterDecisionAuditTest.java
```

---

## 16. Required test scenarios

### Must merge

```text
Liverpool complete signing of Example Player
Example Player joins Liverpool after deal is finalised
```

```text
Man United reach agreement for João Neves
Red Devils seal terms for Benfica midfielder João Neves
```

```text
Arsenal confirm Player X injury
Player X ruled out after Arsenal medical assessment
```

### Must not merge

```text
Liverpool sign Player A
Liverpool sign Player B
```

```text
Arsenal interested in Player A
Chelsea agree deal for Player A
```

```text
Arsenal 2–1 Chelsea on July 1
Arsenal 2–1 Chelsea on July 29
```

```text
Liverpool transfer update
Liverpool match report
```

### Edge cases

- same-source revision update;
- canonical URL duplicated with tracking parameters;
- cross-language coverage;
- generic roundup mentioning several transfers;
- item with no summary;
- embedding timeout;
- invalid vector length;
- model revision change;
- two concurrent same-event imports;
- story outside 24-hour window;
- source removed or article archived;
- manual split followed by a new matching source.

---

## 17. Rollout sequence

### Phase 0 — Compatibility and production proof

- deploy Core dual V1/V2 reader with strict embedding validation and `legacy` default;
- route V1 and V2 normalized items explicitly to raw-item import;
- persist normalized payload before embedding and enrich V2 payload inside the existing spool claim/reclaim path;
- prove pinned PostgreSQL 16 pgvector image, extension privilege, Flyway migration and native vector SQL on real PostgreSQL;
- add a real PostgreSQL+pgvector CI lane for cast, cosine, `AVG(vector)`, advisory lock and concurrent imports;
- set a single model/revision/dimension allow-list; no vector decision is authoritative.

### Phase 1 — Foundation

- introduce pgvector;
- add vector columns/profile and audit tables;
- add contract v2;
- implement local embedding provider;
- store embeddings without changing decisions.

### Phase 2 — Shadow mode

- implement vector candidate retrieval;
- implement hybrid scorer and guards;
- log vector decisions;
- compare with current algorithm;
- build labelled dataset;
- calibrate thresholds.

### Phase 3 — Controlled enablement

- enable vector mode for selected trusted sources;
- monitor false merges and review backlog;
- keep conservative thresholds;
- add a read-only admin decision list, filters and labelled-pair export.

Manual merge/split commands and UI remain out of this phase until their RBAC, optimistic-concurrency, idempotency and atomic recomputation contracts are specified and quality gates are met.

### Phase 4 — Full migration

- enable approved auto-publish sources;
- remove Jaccard as the primary decision;
- retain lexical score only as a feature;
- backfill recent vectors and centroids;
- archive legacy-only code after a stable observation period.

### Phase 5 — Advanced improvements

Only after baseline stability:

- learned reranker;
- multilingual entity extraction;
- per-event-family thresholds;
- automatic split anomaly detection;
- HNSW after exact search becomes slow;
- active learning from manual corrections.

---

## 18. Acceptance criteria

- [ ] Every schema-v2 auto-published raw item has a valid versioned embedding.
- [ ] Core stores raw vectors and story centroids in pgvector.
- [ ] Retrieval is limited to the configured event window.
- [ ] Exact URL/canonical identity is checked before semantic retrieval.
- [ ] Vector similarity is not the sole merge condition.
- [ ] Hard event/entity conflicts prevent auto-merge.
- [ ] Every decision records model version, scores and reason code.
- [ ] Two concurrent same-event imports create one story.
- [ ] Model/provider calls do not occur inside the DB transaction.
- [ ] Provider failure does not silently create low-quality standalone stories.
- [ ] Shadow and authoritative modes are configurable.
- [ ] A labelled benchmark and threshold report are committed.
- [ ] Auto-merge precision meets the target before full enablement.
- [ ] Manual merge/split recomputes centroid, primary source, source count and verification.
- [ ] Existing revision idempotency still passes.
- [ ] Existing non-auto-publish review behaviour still passes.
- [ ] V1 remains compatible; V2 routing and malformed-vector rejection have contract tests with no-side-effect assertions.
- [ ] The existing spool survives a crash between payload persistence, embedding and delivery without losing or recomputing a valid embedding.
- [ ] A real PostgreSQL+pgvector integration lane validates migration, cosine query, centroid average and advisory-lock concurrency.
- [ ] Public article responses never expose vectors, candidate scores or decision snapshots.
- [ ] Semantic membership alone does not promote verification to corroborated reporting or evidence to `SUPPORT`.
- [ ] Career code and Career database are untouched.
- [ ] Repository verification and integrated smoke tests pass.

---

## 19. Agent execution order

1. Add Core dual V1/V2 contract, explicit worker routing and malformed-vector tests.
2. Persist normalized payload before embedding; enrich V2 inside the existing spool claim path.
3. Add pgvector-compatible PostgreSQL image/provisioning proof, nullable metadata migration and real-PG CI lane.
4. Add local embedding provider and tests; store versioned raw-item embeddings with mode `legacy`.
5. Add story cluster profile creation/recomputation, candidate repository and decision audit.
6. Extract clustering from `RawItemImportService`; implement event classifier, entity fingerprint and hybrid scorer.
7. Move Gemini work out of the future advisory-lock path; add lock and concurrency test.
8. Add vector shadow mode, labelled evaluation script and baseline.
9. Backfill the active window, tune thresholds and enable selected trusted sources.
10. Add read-only admin decision/export workflow; add manual correction commands only after their contracts and quality gates exist.
11. Remove Jaccard as primary logic only after the stable observation period.

---

## 20. Final implementation rule

Do not implement this as:

```text
if cosineSimilarity > 0.80:
    merge
```

That version will still merge different transfer stories involving the same player or club.

The required implementation is:

```text
vector retrieval
+ event compatibility
+ entity relationship checks
+ time window
+ calibrated scoring
+ auditability
+ conservative failure behaviour
```

The system must favor a temporary duplicate story over a false merge that combines unrelated evidence.
