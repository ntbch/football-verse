# Design Specification: RSS Crawler & CMS Management

This document defines the design and architecture for the RSS/Atom XML Crawler and its integration into the Admin News CMS.

## 1. Understanding Lock & Scope

* **Goal:** Enable the application to automatically and manually ingest football news articles from RSS/Atom feeds, deduplicate them, and expose them as published articles on the homepage.
* **Target Users:** Admin (can trigger crawls manually and manage sources via the CMS), and public readers (see fresh crawled articles on the homepage).
* **Out of Scope:** Scraping full-text HTML from destination links, automatic translation of foreign language feeds, multi-threaded parallel HTTP crawling (sequential parsing is sufficient for <50 sources).

## 2. Assumptions & Non-Functional Requirements

* **Minimal Dependencies:** Standard JVM XML packages (`javax.xml.parsers.DocumentBuilderFactory` and `org.w3c.dom`) will be used to parse XML. No external parsing libraries (like ROME) are allowed.
* **Concurrency Safety:** An atomic SQL database update is used to guarantee that concurrent instances of the server do not crawl the same feed simultaneously.
* **Author-less Ingestion:** Crawled articles are published under `author = null`, which is natively supported by the frontend (renders as "Uncategorized" or "News").

---

## 3. Decision Log

| Decision Area | Chosen Approach | Alternatives Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Trigger Mechanism** | Hourly Spring `@Scheduled` + manual Admin API POST `/api/v1/admin/news/crawl` | Manual-only trigger | Background schedule ensures fresh content; manual trigger helps admins test changes instantly. |
| **Deduplication** | Unique constraints on `source_url` & SHA-256 `content_hash` (`title + "||" + content`) | Deduplication based on URL only | Feeds sometimes change URLs for redirecting content, while content hashing protects against content updates and URL changes. |
| **XML Parser** | Standard built-in JDK DOM Parser (`RssParser.java`) | ROME library | Keeps codebase light, zero dependencies, easy to handle custom edge cases in RSS 2.0 vs Atom. |
| **Distributed Locking** | Atomic SQL update query on `last_crawled_at` field | ShedLock or Redis lock | Extremely simple, zero-infrastructure, atomic database-level locking ideal for 2-3 load-balanced nodes. |
| **Crawl Source Seed** | Standard feeds seeded in `DataSeeder.java` | DB Migration SQL scripts | Keeps seeder logic centralized and editable for quick test startup. |
| **Admin UI** | Sidebar "Sources" panel next to "Categories" in `AdminNewsPage` | Separate page `/admin/sources` | Keeps CMS workflows in one screen, reducing UI clutter. |

---

## 4. Technical Design

### 4.1. Database Schema Updates
1. Add `last_crawled_at` timestamp field in `news_sources` table.
2. Ensure `source_url` and `content_hash` in `news_articles` table are marked `unique = true`.

### 4.2. XML Parsing (`RssParser.java`)
A helper utility to convert input stream of XML feed data to list of crawled items:
* Reads `<item>` tags for RSS, fallback to `<entry>` tags for Atom.
* Extracts `title`, `link` (or link attributes for Atom), `description`/`summary`/`content`, and `pubDate`/`updated` dates.
* Converts dates to `Instant` using `DateTimeFormatter.RFC_1123_DATE_TIME` or fallbacks.

### 4.3. Concurrency Lock & Ingestion (`NewsService.java`)
Atomic update check to acquire crawl lock:
```sql
UPDATE news_sources 
SET last_crawled_at = :now 
WHERE id = :id 
  AND active = true 
  AND (last_crawled_at IS NULL OR last_crawled_at < :cutoff)
```
If this query returns `1`, the instance is safe to proceed. Sequential crawling parses XML and saves new `NewsArticle` items under status `PUBLISHED`. If parsing a feed fails, it logs `error` and moves on to the next feed source.

### 4.4. Background Worker (`RssScheduler.java`)
Uses Spring's `@Scheduled` annotation mapping to a cron configuration `app.crawl.cron` (defaulting to hourly `0 0 * * * *`).

### 4.5. Seed Sources (`DataSeeder.java`)
On startup, auto-insert ESPN Soccer RSS (`https://www.espn.com/espn/rss/soccer`) and BBC Football RSS (`https://feeds.bbci.co.uk/sport/football/rss.xml`) if no sources exist.

### 4.6. Frontend Admin CMS Panel
Update `frontend/src/app/admin/news/page.tsx` to display a "Sources" list alongside "Categories" in the sidebar, allowing Admin to add new feed names & URLs, and view active sources.
