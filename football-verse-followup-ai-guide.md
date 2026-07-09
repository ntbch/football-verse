# Football Verse – Follow-up Implementation Guide for AI Agents

> Mục tiêu: hướng dẫn AI/code agent sửa tiếp dự án `football-verse` sau khi review lại source code hiện tại.
>
> Lưu ý quan trọng: **không dùng README hoặc các file `.md` cũ để hiểu dự án**, vì tài liệu có thể chưa được cập nhật. Hãy đọc trực tiếp source code.

---

## 1. Bối cảnh hiện tại

Repo: `https://github.com/ntbch/football-verse`

Kiến trúc hiện tại gồm:

```text
football-verse/
  core-service/          # Spring Boot backend chính
  gateway-service/       # Node.js/TypeScript gateway + Socket.IO + crawler trigger
  prediction-service/    # Python service lấy fixture, standings, prediction
  web-client/            # Next.js frontend
  docker-compose.yml
```

Luồng chính:

```text
web-client
  -> gateway-service
      -> core-service
      -> prediction-service
```

Chức năng đang cần ưu tiên là:

```text
User predict trận đấu
-> trận kết thúc
-> hệ thống sync kết quả
-> chấm điểm prediction
-> cập nhật leaderboard
-> gửi notification realtime cho user
-> frontend tự cập nhật
```

---

## 2. Những phần đã ổn

### 2.1. Đã chặn predict sau giờ bóng lăn

Trong `core-service`, `UserPredictionService.submitPrediction()` đã có check kiểu:

```java
if (fixture.getKickoff().isBefore(Instant.now())) {
    // không cho predict
}
```

Đây là đúng hướng.

---

### 2.2. Đã có unique constraint chống predict trùng

Migration `V10__user_predictions.sql` đã có constraint:

```sql
unique (user_id, match_id)
```

Tức là 1 user không thể tạo nhiều prediction cho cùng 1 trận.

---

### 2.3. Đã có ScoringScheduler

Trong `core-service`, đã có `ScoringScheduler`.

Nó tìm fixture có:

```text
status = "result"
scored = false
```

rồi gọi `ScoringService.scoreFixture()`.

Logic này đúng, nhưng hiện còn bị kẹt vì fixture có thể chưa được cập nhật status thật.

---

## 3. Vấn đề quan trọng nhất hiện tại

### FixtureService vẫn ép status thành `"upcoming"`

Trong `core-service/src/main/java/com/footballverse/prediction/FixtureService.java`, hiện có đoạn kiểu:

```java
synced.add(upsert(f, leagueSlug, "upcoming"));
```

Điều này làm cho fixture có thể luôn bị lưu là `upcoming`, dù `prediction-service` hoặc API ngoài đã trả trận là `result`.

Hậu quả:

```text
Trận đã kết thúc
-> API ngoài có score/result
-> DB vẫn lưu status = upcoming
-> ScoringScheduler không tìm thấy fixture result
-> prediction không được chấm điểm
-> leaderboard không cập nhật
-> user không nhận điểm
```

Đây là lỗi phải sửa trước tiên.

---

## 4. PR 1 – Sửa FixtureService lưu status thật

### File cần sửa

```text
core-service/src/main/java/com/footballverse/prediction/FixtureService.java
```

### Việc cần làm

Thêm helper:

```java
private String statusOf(JsonNode fixture) {
    if (fixture.has("status") && !fixture.get("status").isNull()) {
        String status = fixture.get("status").asText();
        if (!status.isBlank()) {
            return status;
        }
    }
    return "upcoming";
}
```

Tìm các đoạn đang gọi:

```java
upsert(f, leagueSlug, "upcoming")
```

Đổi thành:

```java
upsert(f, leagueSlug, statusOf(f))
```

Áp dụng cho cả:

```text
syncFixtures(String leagueSlug)
syncFixturesForLeagueAndRound(String leagueSlug, String round)
```

### Acceptance criteria

- Nếu `prediction-service` trả fixture `status = "result"` thì DB phải lưu `result`.
- Nếu trả `status = "live"` thì DB phải lưu `live`.
- Nếu không có status thì fallback về `upcoming`.
- Không được làm hỏng dữ liệu score/homeTeam/awayTeam/kickoff hiện tại.

---

## 5. PR 2 – Thêm FixtureSyncScheduler

Hiện hệ thống có `ScoringScheduler`, nhưng cần thêm scheduler riêng để sync fixture/result định kỳ.

### File cần tạo

```text
core-service/src/main/java/com/footballverse/prediction/FixtureSyncScheduler.java
```

### Code gợi ý

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

### Acceptance criteria

- Cứ mỗi 60 giây hệ thống sync fixtures từ prediction-service.
- Khi trận chuyển từ `upcoming/live` sang `result`, DB được cập nhật.
- Sau đó `ScoringScheduler` có thể chấm điểm ở lượt chạy tiếp theo.

---

## 6. PR 3 – Thêm notification khi prediction được chấm

Hiện nền tảng notification đã có:

```text
NotificationService
RealtimeNotificationService
Redis channel realtime:notifications:{userId}
gateway-service socket emit notification
```

Nhưng chưa có notification riêng cho prediction scored.

### File cần sửa

```text
core-service/src/main/java/com/footballverse/notification/NotificationType.java
core-service/src/main/java/com/footballverse/prediction/ScoringService.java
```

### Thêm enum

```java
PREDICTION_SCORED
```

### Inject NotificationService vào ScoringService

```java
private final NotificationService notificationService;
```

Nếu class đang dùng `@RequiredArgsConstructor`, chỉ cần thêm field `final`.

### Sau khi tính điểm cho từng prediction

Gọi:

```java
notificationService.create(
    pred.getUser(),
    NotificationType.PREDICTION_SCORED,
    "Your prediction for " + fixture.getHomeTeam() + " vs " + fixture.getAwayTeam()
        + " has been scored. You earned " + points + " points.",
    "/predictions"
);
```

### Acceptance criteria

- Khi prediction được chấm, user nhận notification.
- Notification có type `PREDICTION_SCORED`.
- Gateway có thể emit notification qua Socket.IO như hệ thống notification hiện tại.
- Không gửi notification nếu fixture đã scored trước đó và scheduler chạy lại.

---

## 7. PR 4 – Frontend nhận notification và cập nhật UI

Frontend hiện có React Query và Socket.IO client trong dependencies.

### File nên kiểm tra/tạo

```text
web-client/src/shared/lib/socket.ts
web-client/src/app/predictions/page.tsx
web-client/src/app/predictions/_api.ts
```

### Tạo socket client

```ts
"use client";

import { io } from "socket.io-client";

export const socket = io(
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8000",
  {
    autoConnect: false,
    auth: {
      token: typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null,
    },
  }
);
```

### Trong trang predictions

Khi nhận notification `PREDICTION_SCORED`, invalidate các query liên quan:

```ts
socket.on("notification", (payload) => {
  if (payload.type === "PREDICTION_SCORED") {
    queryClient.invalidateQueries({ queryKey: ["predictions"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["match-centre"] });
  }
});
```

### Acceptance criteria

- User không cần reload trang để thấy điểm mới.
- Khi backend gửi notification, frontend refetch prediction/leaderboard.
- Nếu socket chưa connect thì polling hiện tại vẫn là fallback.

---

## 8. PR 5 – Bảo mật Socket.IO bằng JWT

Hiện tại gateway socket đang nguy hiểm nếu dùng:

```ts
socket.handshake.query.userId
```

vì client có thể giả `userId`.

### File cần sửa

```text
gateway-service/src/socket.ts
gateway-service/package.json
gateway-service/src/auth.ts
```

### Cài package

```bash
cd gateway-service
npm i jsonwebtoken
npm i -D @types/jsonwebtoken
```

### Tạo file auth

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

### Sửa socket.ts

Không dùng:

```ts
socket.handshake.query.userId
```

Dùng:

```ts
const token = socket.handshake.auth?.token;
const payload = verifySocketToken(token);
socket.data.userId = payload.sub;
```

Sau đó join room:

```ts
socket.join(`room:user:${socket.data.userId}`);
```

### CORS socket

Không để:

```ts
origin: "*"
```

Nên dùng:

```ts
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

cors: {
  origin: corsOrigin,
  credentials: true,
}
```

### Acceptance criteria

- Client không thể tự truyền userId để nhận notification của người khác.
- Socket chỉ connect được nếu JWT hợp lệ.
- User chỉ join được room của chính mình.
- CORS không còn `*` trong môi trường deploy thật.

---

## 9. PR 6 – Bỏ fallback `dev-internal-token`

Hiện gateway `/crawl` có thể vẫn dùng default:

```ts
process.env.INTERNAL_TOKEN || "dev-internal-token"
```

Điều này không an toàn khi deploy.

### File cần sửa

```text
gateway-service/src/server.ts
docker-compose.yml
```

### Sửa server.ts

```ts
const expectedToken = process.env.INTERNAL_TOKEN;

if (!expectedToken) {
  return res.status(500).json({
    success: false,
    message: "INTERNAL_TOKEN is not configured",
  });
}

if (token !== expectedToken) {
  return res.status(401).json({
    success: false,
    message: "Unauthorized",
  });
}
```

### Sửa docker-compose

Không dùng:

```yaml
INTERNAL_TOKEN=${INTERNAL_TOKEN:-dev-internal-token}
```

Dùng:

```yaml
INTERNAL_TOKEN=${INTERNAL_TOKEN}
```

### Acceptance criteria

- Nếu thiếu `INTERNAL_TOKEN`, `/crawl` không chạy.
- Không còn default token public/dev trong source.
- Token phải truyền từ `.env`.

---

## 10. PR 7 – Dọn generated files khỏi Git

Hiện repo có thể vẫn còn:

```text
core-service/target/
web-client/scratch/
web-client/tsconfig.tsbuildinfo
```

### File cần sửa

```text
.gitignore
```

### Thêm

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
web-client/tsconfig.tsbuildinfo

# Python
__pycache__/
*.pyc
.venv/
.env

# Local scratch
scratch/
web-client/scratch/

# IDE
.idea/
.vscode/
```

### Chạy lệnh

```bash
git rm -r --cached core-service/target || true
git rm -r --cached web-client/scratch || true
git rm --cached web-client/tsconfig.tsbuildinfo || true

git add .gitignore
git commit -m "chore: remove generated files from repository"
```

### Acceptance criteria

- `core-service/target` không còn trong GitHub.
- `web-client/scratch` không còn trong GitHub.
- `tsconfig.tsbuildinfo` không còn trong GitHub.
- Build local vẫn chạy bình thường.

---

## 11. PR 8 – Chuyển prediction-service sang FastAPI sau cùng

Phần này chưa gấp bằng scoring/socket/security.

Hiện prediction-service dùng:

```text
BaseHTTPRequestHandler
ThreadingHTTPServer
```

Nên chuyển sang:

```text
FastAPI
Uvicorn
Pydantic schemas
Routers theo module
```

### Cấu trúc gợi ý

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

### Yêu cầu quan trọng

Giữ nguyên API path hiện tại để core/gateway không bị vỡ:

```text
GET /health
GET /leagues
GET /matches/{league}/rounds
GET /matches/{league}/live
GET /matches/{league}/fixtures
GET /predictions/{league}
GET /standings/{league}
GET /debug/{league}
```

### Acceptance criteria

- Docker build thành công.
- `GET /health` trả OK.
- Các API cũ vẫn hoạt động.
- `core-service` không cần sửa nhiều.

---

## 12. Thứ tự làm bắt buộc

Không làm lộn xộn. Làm theo thứ tự:

```text
1. Sửa FixtureService lưu status thật
2. Thêm FixtureSyncScheduler
3. Thêm PREDICTION_SCORED notification
4. Frontend nghe notification rồi invalidate query
5. Bảo mật Socket.IO bằng JWT
6. Bỏ fallback dev-internal-token
7. Dọn generated files khỏi Git
8. Sau cùng mới refactor prediction-service sang FastAPI
```

Ưu tiên cao nhất:

```text
1 -> 2 -> 3 -> 4
```

Vì đây là luồng ảnh hưởng trực tiếp tới user.

---

## 13. Checklist test end-to-end

Sau khi làm xong, test theo checklist:

```text
[ ] User tạo prediction trước kickoff thành công
[ ] User sửa prediction trước kickoff thành công
[ ] Sau kickoff không tạo prediction được
[ ] Sau kickoff không sửa prediction được
[ ] Một user không tạo được 2 prediction cho cùng 1 fixture
[ ] Fixture sync được từ prediction-service
[ ] Fixture chuyển từ upcoming/live sang result
[ ] ScoringScheduler tự chấm điểm fixture result
[ ] Prediction có points/correct/scoredAt
[ ] Fixture được mark scored = true
[ ] Scheduler chạy lại không cộng điểm lần 2
[ ] Leaderboard cập nhật
[ ] User nhận notification PREDICTION_SCORED
[ ] Frontend tự refetch prediction/leaderboard
[ ] Socket không cho connect nếu thiếu token
[ ] Socket không cho giả userId
[ ] /crawl không chạy nếu thiếu INTERNAL_TOKEN
[ ] Repo không còn generated files
```

---

## 14. Prompt mẫu cho AI code agent

Dùng prompt này cho AI agent:

```text
Bạn đang làm việc trong repo football-verse.

Không dùng README hoặc file .md cũ để hiểu dự án. Hãy đọc trực tiếp source code.

Nhiệm vụ:
1. Sửa core-service FixtureService để lưu status thật từ prediction-service thay vì ép upcoming.
2. Thêm FixtureSyncScheduler sync fixtures mỗi 60 giây.
3. Thêm NotificationType.PREDICTION_SCORED và gửi notification sau khi prediction được chấm.
4. Sửa frontend để nghe socket notification PREDICTION_SCORED và invalidate React Query liên quan.
5. Sửa gateway-service Socket.IO để xác thực bằng JWT, không dùng userId từ query.
6. Bỏ fallback dev-internal-token ở /crawl.
7. Dọn generated files khỏi Git và cập nhật .gitignore.

Yêu cầu:
- Làm thành các commit/PR nhỏ.
- Không đổi API path nếu không cần thiết.
- Không phá luồng hiện tại của news/forum/auth.
- Không refactor prediction-service sang FastAPI trong cùng PR với scoring/socket.
- Sau mỗi PR phải ghi rõ file đã sửa và cách test.
```

---

## 15. Definition of Done

Chỉ coi là xong khi luồng này chạy được:

```text
User predict trước trận
-> fixture sync định kỳ
-> trận kết thúc
-> fixture status = result
-> ScoringScheduler chấm điểm
-> prediction có điểm
-> leaderboard đổi
-> notification gửi về user
-> frontend tự cập nhật mà không cần reload
```

Nếu thiếu bất kỳ bước nào trong luồng trên thì chưa xong.
