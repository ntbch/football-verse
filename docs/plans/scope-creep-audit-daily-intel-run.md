# Scope Creep Audit: Daily Intel Run Branch

**Date:** 2026-08-21
**Branch:** `agent/strengthen-news-clustering`
**Reviewed against:** `docs/plans/daily-intel-run-design.md`

## Summary

Code review phát hiện 3 nhóm thay đổi nằm ngoài phạm vi của Daily Intel Run spec. Các thay đổi này là intentional work từ các initiatives song song, KHÔNG cần revert.

## Out-of-Scope Items

### 1. News Ingestion Reliability Migrations (V57–V62)

| Migration | Purpose |
|-----------|---------|
| V57 | News ingestion reliability schema |
| V58 | Recompute discovery verification |
| V59 | Recompute official verification |
| V60 | Repair raw item identity duplicates |
| V61 | News read path indexes |
| V62 | AI enrichment outbox |

- **Belongs to:** `news-ingestion-reliability-implementation-plan.md` và `football-intelligence-implementation-plan.md`
- **Status:** Đã implement đúng spec riêng. Chỉ bị gộp chung vào branch do workflow agent.

### 2. YouTube Autoplay Change

- **File:** `apps/web/src/features/news/components/YouTubeEmbed.tsx`
- **Change:** `autoplay=0` → `autoplay=1`
- **Spec reference:** Không có spec nào yêu cầu. UX improvement ad-hoc.
- **Action:** Giữ nguyên; document trong PR description khi merge.

### 3. AI Enrichment Outbox

- **Files:** `NewsAiEnrichmentOutbox.java`, `NewsAiEnrichmentOutboxRepository.java`, `NewsAiEnrichmentService.java`, `V62__news_ai_enrichment_outbox.sql`
- **Belongs to:** `football-intelligence-implementation-plan.md`
- **Status:** Đã implement đúng spec riêng. Tách biệt hoàn toàn với minigame logic.

## Recommendation

Các scope creep items này KHÔNG cần revert vì chúng là intentional work từ các initiatives song song. Khi review Spec compliance cho daily-intel-run, chúng bị flag vì không thuộc spec đó. Future code reviews nên filter theo initiative-specific branches thay vì review toàn bộ branch agent.

</parameter>
</invoke>