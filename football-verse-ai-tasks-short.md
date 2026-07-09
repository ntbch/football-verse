# Football Verse – AI Agent Tasks Short Guide

> Không đọc README/file `.md` cũ để hiểu dự án. Đọc trực tiếp source code.

## Mục tiêu chính

Sửa luồng:

```text
User predict
-> trận kết thúc
-> fixture cập nhật result
-> hệ thống chấm điểm
-> leaderboard cập nhật
-> user nhận notification
-> frontend tự refresh
```

---

## 1. Sửa lỗi status fixture

**File:**

```text
core-service/src/main/java/com/footballverse/prediction/FixtureService.java
```

Hiện fixture có thể đang bị ép:

```java
upsert(f, leagueSlug, "upcoming")
```

Sửa thành lấy status thật từ API:

```java
private String statusOf(JsonNode fixture) {
    if (fixture.has("status") && !fixture.get("status").isNull()) {
        String status = fixture.get("status").asText();
        if (!status.isBlank()) return status;
    }
    return "upcoming";
}
```

Đổi thành:

```java
upsert(f, leagueSlug, statusOf(f))
```

Áp dụng cho cả:

```text
syncFixtures()
syncFixturesForLeagueAndRound()
```

---

## 2. Thêm scheduler sync fixture

**Tạo file:**

```text
core-service/src/main/java/com/footballverse/prediction/FixtureSyncScheduler.java
```

```java
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

Mục đích:

```text
Cập nhật upcoming/live/result định kỳ
```

---

## 3. Thêm notification khi chấm điểm

**Sửa:**

```text
NotificationType.java
ScoringService.java
```

Thêm enum:

```java
PREDICTION_SCORED
```

Trong `ScoringService`, sau khi tính điểm:

```java
notificationService.create(
    pred.getUser(),
    NotificationType.PREDICTION_SCORED,
    "Your prediction has been scored. You earned " + points + " points.",
    "/predictions"
);
```

---

## 4. Frontend tự cập nhật khi có notification

**Sửa/tạo:**

```text
web-client/src/shared/lib/socket.ts
web-client/src/app/predictions/page.tsx
```

Khi nhận notification:

```ts
socket.on("notification", (payload) => {
  if (payload.type === "PREDICTION_SCORED") {
    queryClient.invalidateQueries({ queryKey: ["predictions"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["match-centre"] });
  }
});
```

---

## 5. Bảo mật Socket.IO bằng JWT

**Sửa:**

```text
gateway-service/src/socket.ts
```

Không dùng:

```ts
socket.handshake.query.userId
```

Dùng JWT:

```ts
const token = socket.handshake.auth?.token;
const payload = verifySocketToken(token);
socket.data.userId = payload.sub;
socket.join(`room:user:${socket.data.userId}`);
```

Không để CORS:

```ts
origin: "*"
```

Dùng env:

```ts
origin: process.env.CORS_ORIGIN || "http://localhost:3000"
```

---

## 6. Bỏ token nội bộ mặc định

**Sửa:**

```text
gateway-service/src/server.ts
docker-compose.yml
```

Không dùng:

```ts
process.env.INTERNAL_TOKEN || "dev-internal-token"
```

Dùng:

```ts
const expectedToken = process.env.INTERNAL_TOKEN;

if (!expectedToken) {
  return res.status(500).json({ message: "INTERNAL_TOKEN is not configured" });
}
```

Trong compose, không fallback:

```yaml
INTERNAL_TOKEN=${INTERNAL_TOKEN}
```

---

## 7. Dọn generated files

**Sửa `.gitignore`:**

```gitignore
core-service/target/
web-client/scratch/
web-client/tsconfig.tsbuildinfo
*.tsbuildinfo
node_modules/
.next/
__pycache__/
*.pyc
.env
```

Chạy:

```bash
git rm -r --cached core-service/target || true
git rm -r --cached web-client/scratch || true
git rm --cached web-client/tsconfig.tsbuildinfo || true
```

---

## Thứ tự làm

```text
1. Sửa FixtureService lấy status thật
2. Thêm FixtureSyncScheduler
3. Thêm PREDICTION_SCORED notification
4. Frontend nghe notification và invalidate query
5. Bảo mật socket bằng JWT
6. Bỏ dev-internal-token
7. Dọn generated files
```

---

## Test cuối cùng

Chỉ coi là xong khi chạy được:

```text
User predict trước trận
-> trận kết thúc
-> fixture status = result
-> ScoringScheduler chấm điểm
-> leaderboard cập nhật
-> user nhận notification
-> frontend tự refresh
```
