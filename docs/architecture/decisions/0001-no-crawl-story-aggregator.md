# ADR 0001: API/RSS Story Aggregation Without Full-HTML Crawling

**Status:** Accepted  
**Date:** 2026-07-23

## Context

Football Verse previously discovered links through RSS, Sitemap, or Homepage
sources, then requested each article page and stored extracted HTML as a local
article. This creates operational fragility, larger attack surface, unclear
content-retention rights, and tight coupling between one publisher's HTML and
the public News UI.

The product direction is a football Story aggregator:

- consume structured metadata from approved sources;
- group multiple reports about one event;
- show concise summaries, media, attribution, and original links;
- preserve manual Football Verse editorial articles;
- add YouTube, X, and licensed APIs through provider adapters.

## Decision

1. New automated ingestion does not request full article destination pages.
2. `content-ingestion` owns source scheduling, adapters, checkpoints, durable
   delivery, retry, and operational state.
3. Core owns Publisher, Connector configuration, RawItem, Story, Evidence, and
   all user interactions.
4. Every adapter emits the versioned `NormalizedItem` contract.
5. `news_articles` remains the stable public identity during migration. Its
   `content_kind` distinguishes `EDITORIAL` from `AGGREGATED_STORY`.
6. RawItems are stored separately and linked to Stories.
7. Key points use relational evidence links; unsupported claims are not
   published.
8. AI runs after clustering, is optional, budgeted, and falls back to source
   metadata.
9. Provider identities and revision fingerprints replace full-content hashes
   for idempotency.
10. Legacy crawling stays behind a temporary rollback feature flag until the
    metadata path completes its soak and contraction gates.

## Consequences

Positive:

- provider HTML changes no longer break normal ingestion;
- no full third-party article body is required;
- source provenance becomes enforceable;
- comments, likes, bookmarks, slugs, and public Story IDs remain stable;
- adding a provider does not change the Story pipeline;
- failures and quotas remain isolated per connector.

Costs:

- RSS metadata may be too thin for detailed summaries;
- clustering and evidence require new domain tables;
- media URLs can expire and require local fallback assets;
- source configuration, checkpoint, and provider quota operations need new
  observability;
- legacy and metadata contracts coexist during rollout.

## Rejected Alternatives

- Continue full-HTML scraping: rejected for fragility, rights, and security.
- Store only cards without RawItems: rejected because multi-source provenance
  and corrections would be lost.
- Create a second public `stories` table immediately: rejected because existing
  interactions already reference `news_articles`.
- Add Kafka, CQRS, event sourcing, or a separate AI service now: rejected as
  unmeasured operational complexity.
- Store arbitrary oEmbed HTML: rejected; clients render trusted provider IDs or
  canonical URLs through provider-specific components.

## Validation

- RSS/Atom fixtures prove metadata normalization requires no article HTML.
- Core integration tests prove revision updates preserve Story identity.
- PostgreSQL migration tests preserve existing interaction records.
- Shadow mode must run before legacy crawler contraction.
- Each provider requires contract, quota, replay, and safe-rendering tests.

## Follow-up

Implementation and contraction gates are defined in
`docs/plans/no-crawl-story-aggregator-implementation-plan.md`.
