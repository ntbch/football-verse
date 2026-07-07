# Node.js News Crawler Service Design (Spring Boot + Node.js Integration)

This document specifies the architecture and implementation plan for the Node.js News Crawler Service and its integration with Spring Boot Core.

---

## 1. Understanding Summary

* **Objective**: Replace the Java-based RSS crawler with a Node.js-based crawler to bypass anti-bot protections (like Cloudflare) and free up Spring Boot execution threads.
* **Scope**: 
  * TypeScript/Node.js crawler integrated into the `realtime-gateway` service.
  * Support for `RSS` (XML), `SITEMAP` (XML), and `HOMEPAGE` (HTML) source formats.
  * Internal Spring Boot REST endpoints to fetch config and import cleaned article JSON.
  * Authorization using a shared internal secret token (`X-Internal-Token`).
* **Non-Goals**: Scraping non-news data (e.g. player stats, live scores) or implementing browser-automation with Puppeteer/Playwright.

---

## 2. Major Assumptions

1. **Self-Scheduled Node.js Workers**: Node.js manages its own scheduler (e.g., using `node-cron` or `node-schedule`) to periodically wake up and execute crawls.
2. **Encapsulated Databases**: Node.js does not connect to the database directly; it accesses configurations and submits articles via HTTP REST calls to Spring Boot.
3. **Internal Auth Key**: The shared `X-Internal-Token` key is configured via environment variables on both services (`INTERNAL_TOKEN`).
4. **Graceful Failures**: Scraping errors (e.g., structure change, temporary block) are logged and skipped, ensuring the cron run completes successfully.

---

## 3. Decision Log

### Decision 1: Node.js handles both XML parsing and HTML content extraction
* **Description**: Node.js fetches the XML/HTML feed index, extracts links, downloads the full article HTML, and parses it.
* **Alternatives Considered**: Spring Boot parses RSS and delegates only HTML scraping to Node.js.
* **Rationale**: Moving the entire crawl cycle to Node.js completely isolates external network requests, freeing up Spring Boot's threads and keeping it focused strictly on serving clients.

### Decision 2: got-scraping + cheerio for HTTP requests and DOM parsing
* **Description**: Use `got-scraping` (which automatically uses `fingerprint-suite` tools) to fetch pages and `cheerio` to parse XML and HTML.
* **Alternatives Considered**: Puppeteer/Playwright.
* **Rationale**: Puppeteer requires downloading Chromium and consumes substantial RAM/CPU. `got-scraping` is extremely fast and lightweight while successfully mimicking browser TLS fingerprints to bypass basic Cloudflare screens.

### Decision 3: Internal REST APIs for cross-service communication
* **Description**: Node.js Crawler queries config from `GET /api/v1/internal/news-sources` and pushes articles to `POST /api/v1/internal/news/import`.
* **Alternatives Considered**: Redis queues, Direct Database connection.
* **Rationale**: Exposing simple HTTP endpoints keeps database access encapsulated within Spring Boot, maintaining a clean microservice architecture.

---

## 4. Component Design

### 4.1. Directory Structure

We will place the crawler logic under the `src/crawler` directory inside `gateway-service`:
```text
gateway-service/src/
|-- crawler/
|   |-- link-extractor.ts  # Logic to fetch index and extract article URLs
|   |-- html-scraper.ts    # Logic to fetch and parse full article body
|   |-- cron-scheduler.ts  # Node-cron setup and crawl execution coordination
|-- proxy.ts
|-- socket.ts
|-- server.ts
```

### 4.2. Spring Boot Internal Endpoint Contracts

All internal endpoints require the `X-Internal-Token` header.

#### 1. Fetch Config
* **Path**: `GET /api/v1/internal/news-sources`
* **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "ESPN Soccer",
        "feedUrl": "https://www.espn.com/espn/rss/soccer/news",
        "sourceType": "RSS",
        "cssSelector": ".article-body"
      }
    ]
  }
  ```

#### 2. Import Article
* **Path**: `POST /api/v1/internal/news/import`
* **Request Payload**:
  ```json
  {
    "title": "Clean title",
    "sourceUrl": "https://...",
    "sourceId": 1,
    "summary": "Clean summary text",
    "content": "Cleaned main HTML content body",
    "publishedAt": "2026-07-07T15:30:00Z"
  }
  ```

---

## 5. Verification Plan

* **Local Verification**: Start Redis, PostgreSQL, Spring Boot, and Gateway. Trigger the crawler and verify that articles from Tribuna.com (which previously failed due to Cloudflare 403) are successfully scraped and imported into PostgreSQL.
