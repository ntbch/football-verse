# Simplified No-Crawl RSS Story Aggregator Implementation Plan

**Trạng thái:** Phase 1 → Phase 6 đã hoàn thành (bao gồm Phase 5 AI Summary & Ranking Ponytail).  
**Cập nhật lần cuối:** 2026-07-24  
**Mục tiêu:** Xây dựng hệ thống tự động tổng hợp tin tức bóng đá đa nguồn (RSS, X/Twitter, Reddit, YouTube Highlights, GNews) theo phương châm Ponytail tinh gọn (Zero API Key đắt đỏ, không cào HTML), tối ưu tài nguyên và đáp ứng xuất sắc báo cáo đồ án tốt nghiệp.

---

## Tiến độ Triển khai Tổng quan (Progress Overview)

- [x] **Phase 1: Chuẩn hóa Domain & Internal API (Core Backend)**
- [x] **Phase 2: Ingestion Worker & RSS Adapter (Ingestion Service)**
- [x] **Phase 3: Giao diện Người dùng & Public API (Web Frontend)**
- [x] **Phase 4: Gom nhóm tin bài & Đa nguồn (Light Clustering & Provenance)**
- [x] **Phase 5: AI Summary, Cost Controls & Ranking** *(Ponytail Mode - Gemini 1.5 Flash + Fallback + Hot Score)*
- [x] **Phase 6: Mở rộng Provider (Provider Expansion - X, Reddit, YouTube Highlights, GNews)**
- [x] **Phase 7: Thu dọn Crawler cũ & Hoàn thiện Tài liệu (Contraction & Finalization - Items 1 & 2 Completed)**

---

## 1. Kiến trúc Tổng thể (Overall Architecture)

```text
[ RSS Feeds / X oEmbed / Reddit RSS / YouTube RSS / GNews ]
            │
            ▼ (ETag / Last-Modified Checkpoint)
[ Content Ingestion Service (Node.js/TS) ]
            │
            ▼ (Internal REST / NormalizedItem V1)
[ Core API Service (Spring Boot/Java) ] ───► [ PostgreSQL DB ]
            │
            ▼ (Public REST API)
 [ Web Frontend (Next.js/React) ]
```

---

## 2. Chi tiết Triển khai Các Provider (Phase 6 Completed)

1. **X (Twitter)**:
   * Adapter: `XAdapter` (Sử dụng `publish.twitter.com/oEmbed` công khai, 0$ API Key).
   * Migration `V23`: Seed 17 nhà báo Tier-1 (Fabrizio Romano, David Ornstein...).
   * Frontend: Component `XEmbed.tsx`.

2. **Reddit**:
   * Adapter: Native RSS (`reddit.com/r/{subreddit}/hot.rss`).
   * Migration `V24`: Seed 12 Subreddit bóng đá lớn (`r/soccer`, `r/reddevils`...).
   * Frontend: Component `RedditEmbed.tsx`.

3. **YouTube Highlights**:
   * Adapter: `YouTubeAdapter` (YouTube RSS feeds `youtube.com/feeds/videos.xml`).
   * Ponytail Filter: Tự động lọc chỉ giữ lại video **Match Highlights / Bàn thắng** (Bỏ qua họp báo, phỏng vấn).
   * Migration `V25`: Seed 6 kênh bản quyền giải đấu lớn (Premier League, Serie A, LaLiga, Bundesliga, Ligue 1, FA Cup).
   * Frontend: Component `YouTubeEmbed.tsx` (iFrame player).

4. **GNews (Google News)**:
   * Adapter: `GNewsAdapter` (Hỗ trợ cả Google News RSS miễn phí và GNews.io API).
   * Migration `V26`: Seed 3 nguồn Google News bóng đá tổng hợp.

---

## 3. Các Bước Tiếp theo (Next Steps)

### Phase 7: Thu dọn Crawler cũ & Hoàn thiện Tài liệu (Contraction & Finalization)
* **Gỡ bỏ Crawler cũ**: Xóa bỏ hoàn toàn Playwright, Chromium runtime khỏi Docker container cũ.
* **Schema Contraction**: Cho phép cột `news_articles.content` nhận `NULL` với bài viết tổng hợp.
* **Báo cáo Đồ án**: Tổng kết các số liệu tối ưu hiệu năng (tiết kiệm CPU/RAM, tốc độ sync, tính toàn vẹn Idempotency) làm điểm sáng cho đồ án tốt nghiệp.
