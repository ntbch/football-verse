# Codex Task Spec — Football Verse Architecture Cleanup

Repository: https://github.com/ntbch/football-verse

> Important: read the actual source code only. Do **not** rely on existing `.md` documentation because it may be outdated.

## Goal

Clean up the current Football Verse architecture without rewriting the whole project.

The project already has a good multi-service direction:

```text
web-client        -> Next.js frontend
gateway-service   -> Node.js/TypeScript gateway, proxy, Socket.IO, crawler entry
core-service      -> Spring Boot main backend
prediction-service -> Python football match / prediction service
postgres          -> relational database
redis             -> realtime pub/sub and cache support
```

The goal is to make the current system reliable for real user prediction flow:

```text
User predicts a football match
-> match finishes
-> backend syncs final result
-> predictions are scored
-> leaderboard/statistics are updated
-> user receives realtime notification
-> frontend updates without manual refresh
```

Do this as small safe changes, preferably PR by PR.

---

# Priority Order

Implement in this order:

```text
1. Fix fixture sync status/result flow
2. Add fixture/result sync scheduler
3. Send notification when a prediction is scored
4. Secure Gateway Socket.IO with JWT
5. Standardize API contract between core-service and prediction-service
6. Separate crawler from gateway runtime
7. Convert prediction-service to FastAPI
8. Remove generated/build files from Git
```

Do not rewrite everything at once.

---

# PR 1 — Fix fixture sync status/result flow

## Problem

`ScoringScheduler` only scores fixtures where:

```text
status = "result"
scored = false
```

But fixture sync may currently upsert fixtures as `"upcoming"` even when the external API already returns final results.

That means this can happen:

```text
Match finished
External API has final score
Fixture remains status = upcoming in core DB
ScoringScheduler does not score it
User does not receive updated points
Leaderboard does not update
```

## Required change

In `core-service`, update fixture sync logic so it preserves the real status returned by `prediction-service`.

Target area:

```text
core-service/src/main/java/com/footballverse/prediction/FixtureService.java
```

Add or adapt a helper like this:

```java
private String statusOf(ExternalFixtureResponse fixture) {
    if (fixture.status() == null || fixture.status().isBlank()) {
        return "upcoming";
    }
    return fixture.status();
}
```

If the current implementation still uses `JsonNode`, use the equivalent:

```java
private String statusOf(JsonNode fixture, String fallback) {
    if (fixture.has("status") && !fixture.get("status").isNull()) {
        return fixture.get("status").asText();
    }
    return fallback;
}
```

Replace logic like this:

```java
upsert(f, leagueSlug, "upcoming");
```

with logic like this:

```java
upsert(f, leagueSlug, statusOf(f, "upcoming"));
```

or, if DTO refactor is already done:

```java
match.setStatus(statusOf(fixture));
```

## Acceptance criteria

- Fixtures can become `upcoming`, `live`, or `result`.
- Finished matches are stored with `status = "result"`.
- Final scores are persisted.
- `ScoringScheduler` can find finished unscored fixtures.

---

# PR 2 — Add fixture/result sync scheduler

## Goal

The system should automatically refresh fixture results from `prediction-service`.

Target area:

```text
core-service/src/main/java/com/footballverse/prediction/
```

Create:

```text
FixtureSyncScheduler.java
```

Example:

```java
package com.footballverse.prediction;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class FixtureSyncScheduler {

    private final FixtureService fixtureService;

    @Scheduled(fixedDelayString = "${app.prediction.sync-fixtures-delay-ms:60000}")
    public void syncFixtures() {
        try {
            fixtureService.syncFixtures("premier-league");
        } catch (Exception e) {
            log.warn("Failed to sync fixtures", e);
        }
    }
}
```

If multiple leagues are supported later, make the leagues configurable:

```yaml
app:
  prediction:
    sync-fixtures-delay-ms: 60000
    leagues:
      - premier-league
```

Then loop through them.

## Expected flow

```text
Every 60 seconds:
core-service calls prediction-service fixtures endpoint
-> fixture status and score are updated
-> if status becomes result, ScoringScheduler will score it
```

## Acceptance criteria

- Scheduler runs automatically.
- Scheduler does not crash the app if external API fails.
- Logs warning on failure.
- Finished fixtures are synced into DB.

---

# PR 3 — Notify user when prediction is scored

## Current desired flow

After `ScoringService` scores a user's prediction:

```text
Prediction is scored
-> points calculated
-> prediction updated
-> notification created
-> Redis publishes notification
-> gateway emits Socket.IO event
-> frontend invalidates prediction queries
```

Target areas:

```text
core-service/src/main/java/com/footballverse/prediction/ScoringService.java
core-service/src/main/java/com/footballverse/notification/NotificationType.java
core-service/src/main/java/com/footballverse/notification/NotificationService.java
```

## Add notification type

In `NotificationType.java`, add:

```java
PREDICTION_SCORED
```

## Update ScoringService

Inject `NotificationService` into `ScoringService`.

After a prediction is scored, create notification:

```java
notificationService.create(
    pred.getUser(),
    NotificationType.PREDICTION_SCORED,
    "Your prediction for " + fixture.getHomeTeam() + " vs " + fixture.getAwayTeam()
        + " has been scored. You earned " + points + " points.",
    "/predictions"
);
```

If Vietnamese UI is preferred:

```java
notificationService.create(
    pred.getUser(),
    NotificationType.PREDICTION_SCORED,
    "Dự đoán của bạn cho trận " + fixture.getHomeTeam() + " vs " + fixture.getAwayTeam()
        + " đã được chấm. Bạn nhận được " + points + " điểm.",
    "/predictions"
);
```

## Acceptance criteria

- Each scored prediction creates a notification.
- Notification is published through the existing realtime flow.
- Notification contains points earned.
- Leaderboard cache is cleared after scoring.
- No duplicate notifications if the fixture was already scored.

---

# PR 4 — Secure Gateway Socket.IO with JWT

## Problem

Gateway Socket.IO should not trust `userId` sent from the client query string.

Unsafe pattern:

```ts
socket.handshake.query.userId
socket.join(`room:user:${userId}`)
```

A malicious user could join another user's notification room by changing `userId`.

Target file:

```text
gateway-service/src/socket.ts
```

## Required change

Use JWT from:

```ts
socket.handshake.auth.token
```

The gateway should verify the JWT and derive `userId` from token claims.

Install dependencies:

```bash
cd gateway-service
npm i jsonwebtoken
npm i -D @types/jsonwebtoken
```

Create:

```text
gateway-service/src/auth.ts
```

```ts
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;

export type GatewayJwtPayload = {
  sub: string;
  username?: string;
  roles?: string[];
};

export function verifySocketToken(token?: string): GatewayJwtPayload {
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (!token) {
    throw new Error("Missing token");
  }

  return jwt.verify(token, jwtSecret) as GatewayJwtPayload;
}
```

Update `socket.ts`:

```ts
import { Server, Socket } from "socket.io";
import Redis from "ioredis";
import { Server as HttpServer } from "http";
import { verifySocketToken } from "./auth";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

export const setupSocket = (server: HttpServer): void => {
  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = verifySocketToken(token);

      socket.data.userId = payload.sub;
      socket.data.username = payload.username;
      socket.data.roles = payload.roles ?? [];

      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;

    socket.join(`room:user:${userId}`);

    socket.on("join_thread", (data: { slug: string }) => {
      if (!data?.slug) return;
      socket.join(`room:thread:${data.slug}`);
    });

    socket.on("leave_thread", (data: { slug: string }) => {
      if (!data?.slug) return;
      socket.leave(`room:thread:${data.slug}`);
    });
  });

  const redisSub = new Redis(redisUrl);

  redisSub.psubscribe("realtime:notifications:*", "realtime:threads:*");

  redisSub.on("pmessage", (pattern, channel, message) => {
    const data = JSON.parse(message);
    const parts = channel.split(":");

    if (pattern === "realtime:notifications:*") {
      const userId = parts[2];
      io.to(`room:user:${userId}`).emit("notification", data);
      return;
    }

    if (pattern === "realtime:threads:*") {
      const slug = parts[2];
      io.to(`room:thread:${slug}`).emit("new_reply", data);
    }
  });
};
```

## Environment variables

Update Docker Compose / env files:

```yaml
gateway-service:
  environment:
    - JWT_SECRET=${JWT_SECRET}
    - CORS_ORIGIN=http://localhost:3000

core-service:
  environment:
    - JWT_SECRET=${JWT_SECRET}
```

Important: make sure the token created by `core-service` uses the same JWT secret or public/private key strategy that `gateway-service` can verify.

## Acceptance criteria

- Socket connections without token are rejected.
- Socket connections with invalid token are rejected.
- Socket joins `room:user:{userId}` based on token subject, not client input.
- CORS is not `*` in production.
- Notifications cannot be received by spoofing another user's ID.

---

# PR 5 — Frontend listens for prediction scored events

Target area:

```text
web-client/src/
```

Create shared socket client:

```text
web-client/src/shared/lib/socket.ts
```

Example:

```ts
"use client";

import { io } from "socket.io-client";

export function createSocket(token: string) {
  return io(process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8000", {
    autoConnect: false,
    auth: {
      token,
    },
  });
}
```

In the predictions page or a global notification provider, listen for:

```text
notification
```

When notification type is:

```text
PREDICTION_SCORED
```

Invalidate React Query keys related to:

```text
predictions
leaderboard
stats
match centre
notifications
```

Example:

```tsx
useEffect(() => {
  if (!token) return;

  const socket = createSocket(token);
  socket.connect();

  socket.on("notification", (payload) => {
    if (payload.type === "PREDICTION_SCORED") {
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  return () => {
    socket.off("notification");
    socket.disconnect();
  };
}, [token, queryClient]);
```

## Acceptance criteria

- User receives realtime update when prediction is scored.
- Predictions page updates without manual refresh.
- Leaderboard updates after scoring.
- Existing polling can remain as fallback.

---

# PR 6 — Standardize API contract between core-service and prediction-service

## Problem

`core-service` should not depend on loose JSON parsing from `prediction-service`.

Create a typed client and DTOs.

Target structure:

```text
core-service/src/main/java/com/footballverse/prediction/client/
  PredictionServiceClient.java
  dto/
    ExternalFixturesResponse.java
    ExternalFixtureResponse.java
    ExternalTeamResponse.java
    ExternalScoreResponse.java
```

DTO examples:

```java
package com.footballverse.prediction.client.dto;

import java.util.List;

public record ExternalFixturesResponse(
    String source,
    String league,
    List<ExternalFixtureResponse> fixtures
) {}
```

```java
package com.footballverse.prediction.client.dto;

public record ExternalFixtureResponse(
    String id,
    String league,
    String round,
    String status,
    String kickoff,
    ExternalTeamResponse homeTeam,
    ExternalTeamResponse awayTeam,
    ExternalScoreResponse score
) {}
```

```java
package com.footballverse.prediction.client.dto;

public record ExternalTeamResponse(
    String id,
    String name,
    String shortName,
    String crest
) {}
```

```java
package com.footballverse.prediction.client.dto;

public record ExternalScoreResponse(
    Integer home,
    Integer away
) {}
```

Client example:

```java
package com.footballverse.prediction.client;

import com.footballverse.prediction.client.dto.ExternalFixturesResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
public class PredictionServiceClient {

    private final RestClient restClient;

    @Value("${app.prediction-service.url:http://localhost:8090}")
    private String predictionServiceUrl;

    public ExternalFixturesResponse getFixtures(String leagueSlug, String round) {
        String uri = predictionServiceUrl + "/matches/" + leagueSlug + "/fixtures";

        if (round != null && !round.isBlank()) {
            uri += "?round=" + URLEncoder.encode(round, StandardCharsets.UTF_8);
        }

        return restClient.get()
            .uri(uri)
            .retrieve()
            .body(ExternalFixturesResponse.class);
    }
}
```

Then refactor `FixtureService` to use `PredictionServiceClient`.

## Expected prediction-service response shape

```json
{
  "source": "football-data",
  "league": "premier-league",
  "fixtures": [
    {
      "id": "123",
      "league": "Premier League",
      "round": "Matchday 1",
      "status": "upcoming",
      "kickoff": "2026-08-01T14:00:00Z",
      "homeTeam": {
        "id": "1",
        "name": "Arsenal",
        "shortName": "ARS",
        "crest": "https://..."
      },
      "awayTeam": {
        "id": "2",
        "name": "Chelsea",
        "shortName": "CHE",
        "crest": "https://..."
      },
      "score": {
        "home": null,
        "away": null
      }
    }
  ]
}
```

For finished match:

```json
{
  "id": "123",
  "status": "result",
  "score": {
    "home": 2,
    "away": 1
  }
}
```

## Acceptance criteria

- `FixtureService` no longer spreads JSON parsing logic everywhere.
- Contract is explicit and typed.
- Missing required fields are handled safely.
- Existing endpoints continue to work.

---

# PR 7 — Separate crawler from gateway runtime

## Problem

`gateway-service` currently acts as:

```text
API proxy
Socket.IO realtime server
crawler scheduler
manual crawl trigger
```

This is too much responsibility for one runtime.

Do a light separation first. Keep same codebase, but make crawler a separate worker process.

Target structure:

```text
gateway-service/src/
  server.ts
  proxy.ts
  socket.ts
  crawler/
    index.ts
    cron-scheduler.ts
    sources/
    normalizers/
    publishers/
```

Create:

```text
gateway-service/src/crawler/index.ts
```

```ts
import { startCronScheduler, runCrawlCycle } from "./cron-scheduler";

export function startCrawlerWorker() {
  if (process.env.ENABLE_CRAWLER !== "true") {
    console.log("[Crawler] disabled");
    return;
  }

  startCronScheduler();
}

export async function triggerCrawlManually() {
  return runCrawlCycle();
}
```

Update gateway `server.ts`:

```ts
import express from "express";
import { createServer } from "http";
import { setupProxy } from "./proxy";
import { setupSocket } from "./socket";
import { startCrawlerWorker, triggerCrawlManually } from "./crawler";

const app = express();
const server = createServer(app);

setupProxy(app);
setupSocket(server);
startCrawlerWorker();

app.post("/crawl", async (req, res) => {
  const token = req.headers["x-internal-token"];
  const expectedToken = process.env.INTERNAL_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  triggerCrawlManually().catch((err) =>
    console.error("[Crawler] Manual crawl failed:", err)
  );

  res.json({ success: true, message: "Crawl cycle triggered" });
});
```

For production-like compose, run crawler separately:

```yaml
gateway-service:
  build: ./gateway-service
  command: npm run start
  environment:
    - ENABLE_CRAWLER=false
    - REDIS_URL=redis://redis:6379
    - BACKEND_URL=http://core-service:8080

crawler-service:
  build: ./gateway-service
  command: npm run start:crawler
  environment:
    - ENABLE_CRAWLER=true
    - REDIS_URL=redis://redis:6379
    - BACKEND_URL=http://core-service:8080
    - INTERNAL_TOKEN=${INTERNAL_TOKEN}
  depends_on:
    - redis
    - core-service
```

Add scripts if needed:

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "start:crawler": "node dist/crawler-worker.js",
    "dev": "tsx src/server.ts",
    "dev:crawler": "tsx src/crawler-worker.ts"
  }
}
```

Create:

```text
gateway-service/src/crawler-worker.ts
```

```ts
import { startCrawlerWorker } from "./crawler";

startCrawlerWorker();
```

## Acceptance criteria

- Gateway can run without crawler.
- Crawler can run as a separate worker.
- Manual crawl endpoint remains protected by `INTERNAL_TOKEN`.
- No fallback default internal token in production.

---

# PR 8 — Convert prediction-service to FastAPI

## Problem

`prediction-service` currently uses Python `BaseHTTPRequestHandler` and manual routing.

That is okay for MVP, but hard to maintain when routes, schemas, errors, and validation grow.

## Goal

Convert to FastAPI while preserving existing endpoint URLs as much as possible.

Target structure:

```text
prediction-service/
  app/
    main.py
    config.py
    routers/
      health.py
      leagues.py
      matches.py
      predictions.py
      standings.py
    schemas/
      fixture.py
      prediction.py
      standing.py
    services/
      football_api.py
      prediction_engine.py
  requirements.txt
  Dockerfile
```

## requirements.txt

```txt
fastapi==0.115.6
uvicorn[standard]==0.34.0
pydantic==2.10.4
python-dotenv==1.0.1
requests==2.32.3
```

## app/main.py

```py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, leagues, matches, predictions, standings

app = FastAPI(title="Football Verse Prediction Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin] if settings.cors_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(leagues.router)
app.include_router(matches.router)
app.include_router(predictions.router)
app.include_router(standings.router)
```

## app/routers/health.py

```py
from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/health")
def health():
    return {"status": "ok"}
```

## app/routers/matches.py

```py
from fastapi import APIRouter, Query
from app.services.football_api import live_payload, round_fixtures_payload, rounds_payload

router = APIRouter(prefix="/matches", tags=["matches"])

@router.get("/{league_slug}/rounds")
def get_rounds(league_slug: str):
    return rounds_payload(league_slug)

@router.get("/{league_slug}/live")
def get_live(league_slug: str):
    return live_payload(league_slug)

@router.get("/{league_slug}/fixtures")
def get_fixtures(league_slug: str, round: str | None = Query(default=None)):
    return round_fixtures_payload(league_slug, round)
```

## Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8090

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]
```

## Acceptance criteria

- Existing gateway/core calls keep working.
- `/health` works.
- `/leagues` works.
- `/matches/{league}/rounds` works.
- `/matches/{league}/live` works.
- `/matches/{league}/fixtures` works.
- `/predictions/{league}` works.
- `/standings/{league}` works.
- Response shape remains compatible with `core-service`.

---

# PR 9 — Remove generated/build files from Git

## Goal

Remove generated files and build output from the repository.

Add or update root `.gitignore`:

```gitignore
# Java
core-service/target/
*.class

# Node / Next
node_modules/
.next/
dist/
build/
*.tsbuildinfo

# Python
__pycache__/
*.pyc
.venv/
.env

# IDE
.idea/
.vscode/

# Local scratch
scratch/
```

Then run:

```bash
git rm -r --cached core-service/target || true
git rm -r --cached web-client/.next || true
git rm --cached web-client/tsconfig.tsbuildinfo || true
git rm -r --cached web-client/scratch || true

git add .gitignore
git commit -m "chore: remove generated files from repository"
```

## Acceptance criteria

- Generated files are not tracked.
- Build artifacts are ignored.
- Local env files are ignored.
- Project still builds after clean clone.

---

# Test Checklist

## Backend prediction flow

Test manually:

```text
1. Create user
2. Sync fixtures
3. Create prediction for fixture
4. Simulate fixture result
5. Run scoring scheduler or call scoring service
6. Verify prediction points updated
7. Verify fixture scored = true
8. Verify leaderboard cache cleared
9. Verify notification created
```

## Socket security

Test:

```text
1. Connect without token -> rejected
2. Connect with invalid token -> rejected
3. Connect with valid token -> accepted
4. Try to spoof userId query -> ignored
5. Notification for user A is not received by user B
```

## Frontend

Test:

```text
1. User opens predictions page
2. Prediction gets scored
3. Socket notification arrives
4. React Query invalidates prediction/leaderboard/stat queries
5. UI updates without reload
```

## Crawler

Test:

```text
1. Gateway starts with ENABLE_CRAWLER=false
2. Crawler worker starts with ENABLE_CRAWLER=true
3. Manual /crawl requires valid x-internal-token
4. No default dev token is accepted in production
```

## Prediction service

Test:

```text
1. /health
2. /leagues
3. /matches/premier-league/rounds
4. /matches/premier-league/live
5. /matches/premier-league/fixtures
6. /predictions/premier-league
7. /standings/premier-league
```

---

# Definition of Done

The task is complete when:

```text
- User predictions are scored after a match result is synced.
- Finished fixtures become status = result.
- Users receive notification when predictions are scored.
- Frontend updates predictions/leaderboard without manual reload.
- Socket.IO does not trust userId from client query.
- Gateway and crawler can run as separate processes.
- prediction-service has clear routes and schemas.
- API contract between core-service and prediction-service is typed and stable.
- Generated files are removed from Git.
```

Do not remove existing functionality unless it is clearly broken. Keep endpoint compatibility wherever possible.
