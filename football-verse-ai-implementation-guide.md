# Football Verse — AI Implementation Guide

> Mục tiêu của file này: dùng làm tài liệu hướng dẫn cho AI/code agent khi tiếp tục phát triển dự án `football-verse`.
>
> Quan trọng: **không dựa vào README hoặc các file `.md` cũ để hiểu dự án**, vì chúng có thể chưa được cập nhật. Hãy đọc source code hiện tại trước khi sửa.

---

## 0. Bối cảnh dự án hiện tại

Repo: `https://github.com/ntbch/football-verse`

Dự án hiện đang đi theo hướng multi-service:

```txt
web-client        -> Next.js frontend
 gateway-service  -> Node.js/TypeScript gateway, proxy, socket, crawler trigger
 core-service     -> Spring Boot backend chính: auth, user, news, forum, prediction, notification
 prediction-service -> Python service xử lý match data / prediction data
 postgres         -> database chính
 redis            -> realtime pub/sub, cache
```

Luồng tổng quát:

```txt
User
 -> web-client
 -> gateway-service
 -> core-service hoặc prediction-service
 -> postgres / redis
```

Hiện tại không cần viết lại toàn bộ dự án. Việc nên làm là:

```txt
1. Chuẩn hóa API contract giữa các service
2. Sửa luồng fixture/result/scoring cho prediction
3. Bảo mật gateway/socket
4. Dọn generated files khỏi repo
5. Tách crawler rõ hơn
6. Chuẩn hóa prediction-service thành service Python tốt hơn
7. Bổ sung luật prediction, chống gian lận, transaction, test, admin tooling
```

---

## 1. Nguyên tắc cho AI/code agent

Khi AI sửa dự án này, bắt buộc tuân thủ:

```txt
- Không rewrite toàn bộ nếu không cần.
- Không đổi API public bừa bãi nếu frontend/core/gateway đang dùng.
- Không tin README là đúng 100%.
- Luôn đọc source code trước khi sửa.
- Ưu tiên sửa nhỏ theo từng PR.
- Không hard-code secret/token.
- Không để userId truyền từ client quyết định quyền realtime.
- Backend phải validate mọi rule quan trọng, không chỉ frontend.
- Prediction có thưởng điểm thì phải chống gian lận.
- Khi sửa logic scoring phải có test.
```

Nếu có xung đột giữa tài liệu này và source code hiện tại, hãy ưu tiên source code hiện tại, nhưng phải ghi chú lại lý do.

---

## 2. Thứ tự PR nên làm

Nên chia thành các PR nhỏ:

```txt
PR 1: Fix fixture status/result sync
PR 2: Lock prediction sau kickoff + chống predict trùng
PR 3: Transaction-safe scoring + score logs
PR 4: Notification realtime khi prediction được chấm
PR 5: Bảo mật gateway/socket bằng JWT
PR 6: Chuẩn hóa API contract core-service <-> prediction-service
PR 7: Dọn generated files + .gitignore
PR 8: Tách crawler thành worker/process riêng
PR 9: Refactor prediction-service sang FastAPI
PR 10: Admin tools + health check + logging + tests
```

Ưu tiên cao nhất là PR 1 đến PR 5 vì ảnh hưởng trực tiếp đến user prediction.

---

# PR 1 — Fix fixture status/result sync

## Vấn đề

`ScoringScheduler` chỉ chấm điểm fixture có:

```txt
status = "result"
scored = false
```

Nhưng trong `FixtureService`, một số luồng sync đang upsert fixture với status bị ép là:

```java
"upcoming"
```

Điều này có thể làm trận đã kết thúc nhưng backend vẫn không chấm điểm.

## File cần đọc

```txt
core-service/src/main/java/com/footballverse/prediction/FixtureService.java
core-service/src/main/java/com/footballverse/prediction/ScoringScheduler.java
core-service/src/main/java/com/footballverse/prediction/ScoringService.java
prediction-service/football_api.py
prediction-service/app.py
```

## Việc cần làm

Trong `FixtureService`, thêm helper lấy status thật từ payload:

```java
private String statusOf(JsonNode fixture, String fallback) {
    if (fixture.has("status") && !fixture.get("status").isNull()) {
        String status = fixture.get("status").asText();
        if (!status.isBlank()) {
            return status;
        }
    }
    return fallback;
}
```

Sửa các đoạn kiểu:

```java
synced.add(upsert(f, leagueSlug, "upcoming"));
```

thành:

```java
synced.add(upsert(f, leagueSlug, statusOf(f, "upcoming")));
```

Áp dụng cho:

```txt
syncFixtures(String leagueSlug)
syncFixturesForLeagueAndRound(String leagueSlug, String round)
syncResults(String leagueSlug) nếu cần chuẩn hóa lại
```

## Acceptance criteria

```txt
- Fixture upcoming vẫn lưu upcoming.
- Fixture live lưu live.
- Fixture result lưu result.
- Khi prediction-service trả score + result, core-service lưu homeScore/awayScore/status đúng.
- ScoringScheduler tìm được fixture result và chấm điểm.
```

---

# PR 2 — Lock prediction sau kickoff + chống predict trùng

## Vấn đề

Nếu user có thể gửi prediction sau khi trận bắt đầu hoặc gần kết thúc thì hệ thống điểm/thưởng không công bằng.

Backend phải chặn, không chỉ frontend.

## File cần đọc

```txt
core-service/src/main/java/com/footballverse/prediction/UserPrediction.java
core-service/src/main/java/com/footballverse/prediction/UserPredictionRepository.java
core-service/src/main/java/com/footballverse/prediction/PredictionController.java
core-service/src/main/java/com/footballverse/prediction/PredictionService.java
core-service/src/main/resources/db/migration/
```

Tên class/service có thể khác, hãy tìm theo keyword:

```txt
UserPrediction
PredictionRequest
predict
fixture
kickoff
```

## Rule bắt buộc

```txt
User chỉ được tạo/sửa prediction nếu now < fixture.kickoff.
Sau kickoff, prediction bị khóa.
Một user chỉ được có một prediction cho một fixture.
```

## Backend validation

Trong service tạo/sửa prediction:

```java
if (fixture.getKickoff() != null && !Instant.now().isBefore(fixture.getKickoff())) {
    throw new BusinessException("PREDICTION_CLOSED", "Prediction is closed for this fixture");
}
```

Validate score:

```txt
homeScore >= 0
awayScore >= 0
homeScore <= 20
awayScore <= 20
fixture tồn tại
fixture chưa kickoff
user chưa bị ban nếu hệ thống có ban
```

## DB unique constraint

Thêm migration:

```sql
ALTER TABLE user_predictions
ADD CONSTRAINT uk_user_prediction_fixture UNIQUE (user_id, fixture_id);
```

Nếu tên bảng khác, hãy đọc entity/migration hiện tại trước.

## Acceptance criteria

```txt
- User không thể predict sau kickoff.
- User không thể sửa prediction sau kickoff.
- User không thể tạo nhiều prediction cho cùng một trận.
- API trả error code rõ ràng: PREDICTION_CLOSED hoặc PREDICTION_ALREADY_EXISTS.
```

---

# PR 3 — Transaction-safe scoring + score logs

## Vấn đề

Hiện scoring dùng `fixture.scored = true`, nhưng nên làm chắc hơn để tránh:

```txt
- Scheduler chạy trùng
- Service restart giữa chừng
- Chấm điểm lặp
- Không giải thích được vì sao user được điểm
```

## File cần đọc

```txt
core-service/src/main/java/com/footballverse/prediction/ScoringService.java
core-service/src/main/java/com/footballverse/prediction/Fixture.java
core-service/src/main/java/com/footballverse/prediction/FixtureRepository.java
core-service/src/main/java/com/footballverse/prediction/UserPrediction.java
core-service/src/main/resources/db/migration/
```

## Lock fixture khi scoring

Trong repository, thêm query lock pessimistic:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select f from Fixture f where f.id = :id")
Optional<Fixture> findByIdForUpdate(@Param("id") Long id);
```

Trong `scoreFixture`:

```java
@Transactional
@CacheEvict(value = "leaderboard", allEntries = true)
public void scoreFixture(Long fixtureId) {
    Fixture fixture = fixtureRepo.findByIdForUpdate(fixtureId).orElseThrow();

    if (fixture.isScored()) return;
    if (!"result".equals(fixture.getStatus())) return;
    if (fixture.getHomeScore() == null || fixture.getAwayScore() == null) return;

    // score predictions

    fixture.setScored(true);
    fixture.setScoredAt(Instant.now());
}
```

Nếu `Fixture` chưa có `scoredAt`, thêm field và migration.

## Thêm score log

Tạo bảng:

```sql
CREATE TABLE prediction_score_logs (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT NOT NULL,
    fixture_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    points INT NOT NULL,
    outcome_points INT NOT NULL DEFAULT 0,
    exact_score_points INT NOT NULL DEFAULT 0,
    ou25_points INT NOT NULL DEFAULT 0,
    btts_points INT NOT NULL DEFAULT 0,
    reason TEXT,
    scored_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_prediction_score_logs_user_id ON prediction_score_logs(user_id);
CREATE INDEX idx_prediction_score_logs_fixture_id ON prediction_score_logs(fixture_id);
CREATE INDEX idx_prediction_score_logs_prediction_id ON prediction_score_logs(prediction_id);
```

Entity gợi ý:

```java
@Entity
@Table(name = "prediction_score_logs")
public class PredictionScoreLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private UserPrediction prediction;

    @ManyToOne(fetch = FetchType.LAZY)
    private Fixture fixture;

    @ManyToOne(fetch = FetchType.LAZY)
    private UserAccount user;

    private int points;
    private int outcomePoints;
    private int exactScorePoints;
    private int ou25Points;
    private int bttsPoints;

    @Column(columnDefinition = "TEXT")
    private String reason;

    private Instant scoredAt;
}
```

## Acceptance criteria

```txt
- Fixture không thể bị chấm điểm 2 lần khi scheduler chạy song song.
- Có bảng log giải thích điểm từng prediction.
- User có thể xem lịch sử: trận nào được bao nhiêu điểm, vì sao.
- Leaderboard vẫn được clear cache sau khi scoring.
```

---

# PR 4 — Notification realtime khi prediction được chấm

## Bối cảnh

Dự án đã có realtime qua Redis + Socket.IO. Core-service publish notification vào Redis, gateway-service nhận Redis message và emit socket về user room.

## File cần đọc

```txt
core-service/src/main/java/com/footballverse/notification/NotificationService.java
core-service/src/main/java/com/footballverse/notification/RealtimeNotificationService.java
core-service/src/main/java/com/footballverse/notification/NotificationType.java
gateway-service/src/socket.ts
web-client/src/**
```

## Việc cần làm

Thêm type:

```java
PREDICTION_SCORED
```

Trong `ScoringService`, sau khi tính điểm cho từng prediction:

```java
notificationService.create(
    pred.getUser(),
    NotificationType.PREDICTION_SCORED,
    "Your prediction for " + fixture.getHomeTeam() + " vs " + fixture.getAwayTeam()
        + " has been scored. You earned " + points + " points.",
    "/predictions"
);
```

Nếu project đang dùng tiếng Việt, message có thể là:

```txt
Dự đoán của bạn cho trận Arsenal vs Chelsea đã được chấm. Bạn nhận được 8 điểm.
```

## Frontend cần làm

Trang predictions nên nghe event socket:

```txt
notification.type === "PREDICTION_SCORED"
```

Sau đó invalidate query:

```txt
predictions
prediction-stats
leaderboard
fixtures/matches nếu cần
```

Nếu đang dùng React Query:

```ts
queryClient.invalidateQueries({ queryKey: ["predictions"] });
queryClient.invalidateQueries({ queryKey: ["prediction-stats"] });
queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
```

## Acceptance criteria

```txt
- Khi trận result được chấm, user nhận notification realtime.
- UI cập nhật điểm/user stats/leaderboard mà không cần reload trang.
- Nếu socket mất kết nối, polling vẫn refetch được sau một khoảng thời gian.
```

---

# PR 5 — Bảo mật gateway/socket bằng JWT

## Vấn đề

Gateway socket không được tin `userId` từ client query.

Không an toàn:

```ts
socket.handshake.query.userId
```

Vì user có thể giả userId của người khác để nhận notification của họ.

## File cần đọc

```txt
gateway-service/src/socket.ts
gateway-service/src/server.ts
core-service/src/main/java/com/footballverse/security/**
web-client/src/** auth/token/session files
```

## Việc cần làm

Client phải gửi JWT qua socket auth:

```ts
const socket = io(GATEWAY_URL, {
  auth: {
    token: accessToken,
  },
});
```

Gateway verify JWT:

```ts
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    if (!jwtSecret) return next(new Error("JWT_SECRET is not configured"));

    const payload = jwt.verify(token, jwtSecret) as { sub: string; roles?: string[] };
    socket.data.userId = payload.sub;
    socket.data.roles = payload.roles ?? [];
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});
```

Join room bằng userId từ token:

```ts
io.on("connection", (socket) => {
  const userId = socket.data.userId;
  socket.join(`room:user:${userId}`);
});
```

## CORS

Không để production socket CORS là `*`.

Dùng:

```ts
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
```

## INTERNAL_TOKEN

Không fallback `dev-internal-token` trong production.

Nên sửa logic:

```ts
const expectedToken = process.env.INTERNAL_TOKEN;

if (!expectedToken) {
  return res.status(500).json({
    success: false,
    message: "INTERNAL_TOKEN is not configured",
  });
}
```

## Acceptance criteria

```txt
- Client không thể join room của user khác bằng query userId.
- Socket connect thiếu token bị reject.
- Socket token sai bị reject.
- CORS không mở toàn bộ trong production.
- INTERNAL_TOKEN không có fallback yếu trong production.
```

---

# PR 6 — Chuẩn hóa API contract core-service <-> prediction-service

## Vấn đề

Core-service hiện parse JSON thô bằng `JsonNode`, dễ lỗi nếu prediction-service đổi field.

## Mục tiêu

Tạo DTO rõ ràng cho response từ prediction-service.

## File/thư mục đề xuất

```txt
core-service/src/main/java/com/footballverse/prediction/client/
  PredictionServiceClient.java
  dto/
    ExternalFixturesResponse.java
    ExternalFixtureResponse.java
    ExternalTeamResponse.java
    ExternalScoreResponse.java
```

## DTO gợi ý

```java
public record ExternalFixturesResponse(
    String source,
    String league,
    List<ExternalFixtureResponse> fixtures
) {}
```

```java
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
public record ExternalTeamResponse(
    String id,
    String name,
    String shortName,
    String crest
) {}
```

```java
public record ExternalScoreResponse(
    Integer home,
    Integer away
) {}
```

## Client gợi ý

```java
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

Nếu project đang dùng `HttpClient` thay vì `RestClient`, có thể giữ tạm `HttpClient`, nhưng nên gom vào `PredictionServiceClient`, không để `FixtureService` tự gọi HTTP + parse JSON.

## Acceptance criteria

```txt
- FixtureService không còn chịu trách nhiệm gọi HTTP trực tiếp.
- Contract response từ prediction-service có DTO rõ ràng.
- Nếu prediction-service thiếu field quan trọng, lỗi dễ phát hiện.
```

---

# PR 7 — Dọn generated files + .gitignore

## Vấn đề

Không nên commit file build/generated/cache vào repo.

## Thêm `.gitignore` ở root

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
venv/

# Env
.env
.env.*
!.env.example

# IDE
.idea/
.vscode/

# OS
.DS_Store
Thumbs.db

# Local scratch
scratch/
web-client/scratch/
```

## Xóa khỏi git tracking

```bash
git rm -r --cached core-service/target || true
git rm -r --cached web-client/.next || true
git rm --cached web-client/tsconfig.tsbuildinfo || true
git rm -r --cached web-client/scratch || true

git add .gitignore
git commit -m "chore: remove generated files from repository"
```

## Acceptance criteria

```txt
- Build artifacts không còn xuất hiện trong git status.
- Repo clone nhẹ hơn.
- Không xóa nhầm source code.
```

---

# PR 8 — Tách crawler rõ hơn

## Vấn đề

Gateway đang vừa proxy, vừa socket, vừa có crawler logic. Dùng được cho MVP, nhưng về lâu dài gateway không nên ôm quá nhiều trách nhiệm.

## Mục tiêu

Trước mắt chưa cần tách repo. Chỉ cần tách process/module rõ hơn.

## Cấu trúc đề xuất

```txt
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

## `crawler/index.ts` gợi ý

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

## Compose gợi ý

Có thể chạy crawler thành process riêng:

```yaml
gateway-service:
  build: ./gateway-service
  environment:
    - ENABLE_CRAWLER=false

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

## Acceptance criteria

```txt
- Gateway vẫn proxy/socket bình thường.
- Crawler có thể bật/tắt bằng env.
- Có thể chạy crawler riêng mà không ảnh hưởng gateway.
- Manual crawl endpoint vẫn bảo vệ bằng INTERNAL_TOKEN.
```

---

# PR 9 — Refactor prediction-service sang FastAPI

## Vấn đề

Python service hiện dùng HTTP server thủ công. MVP được, nhưng khó maintain, khó validate schema, khó mở rộng.

## Mục tiêu

Chuyển sang FastAPI nhưng giữ endpoint cũ để core/gateway không phải sửa nhiều.

## Cấu trúc đề xuất

```txt
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

## matches router

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

```txt
- Các endpoint cũ vẫn chạy:
  - GET /health
  - GET /leagues
  - GET /matches/{league}/rounds
  - GET /matches/{league}/live
  - GET /matches/{league}/fixtures
  - GET /predictions/{league}
  - GET /standings/{league}
- Response format không phá core-service.
- Docker Compose vẫn chạy được.
```

---

# PR 10 — Admin tools, health check, logging, tests

## Admin fixture tools

Cần trang/admin API để kiểm tra fixture sync và scoring.

Tính năng đề xuất:

```txt
- Danh sách fixture
- Lọc theo league/status/scored
- Xem kickoff/home/away/score/status/lastSyncedAt/scoredAt
- Nút sync fixture thủ công
- Nút score fixture thủ công
- Nút rescore fixture nếu admin cho phép
```

API gợi ý:

```txt
GET  /api/v1/admin/fixtures?status=result&scored=false
POST /api/v1/admin/fixtures/sync?league=premier-league
POST /api/v1/admin/fixtures/{id}/score
POST /api/v1/admin/fixtures/{id}/rescore
```

`rescore` phải cực kỳ cẩn thận vì có thể làm thay đổi leaderboard.

## Health check

Mỗi service nên có health endpoint:

```txt
core-service: GET /actuator/health hoặc /health
prediction-service: GET /health
gateway-service: GET /health
web-client: Next.js health route nếu cần
```

Gateway health nên check:

```txt
core-service reachable
prediction-service reachable
redis reachable
```

## Logging

Khi sync fixture/result, log:

```txt
league
fixtureId
oldStatus -> newStatus
oldScore -> newScore
kickoff
source
```

Khi scoring, log:

```txt
fixtureId
homeTeam vs awayTeam
score
number of predictions scored
leaderboard cache evicted
```

## Tests cần có

Ưu tiên test backend prediction/scoring:

```txt
- Không predict được sau kickoff
- Không sửa prediction sau kickoff
- Không tạo prediction trùng user+fixture
- Đúng outcome được +3
- Đúng exact score được +5
- Đúng over/under 2.5 được +2
- Đúng BTTS được +2
- Sai hết được 0
- Fixture scored=true thì không score lại
- Fixture chưa có score thì không score
- Fixture status != result thì không score
```

---

## 3. Checklist chống gian lận prediction

Bắt buộc hoàn thành nếu có điểm/thưởng:

```txt
[ ] Backend chặn predict sau kickoff
[ ] Backend chặn sửa prediction sau kickoff
[ ] DB unique user_id + fixture_id
[ ] Score trong prediction request được validate
[ ] Fixture result được sync tự động
[ ] Scoring chạy transaction-safe
[ ] Không chấm điểm lặp
[ ] Có score log
[ ] Có notification khi được chấm điểm
[ ] Leaderboard cache clear sau scoring
[ ] Có test scoring
```

---

## 4. Checklist realtime

```txt
[ ] Socket dùng JWT, không dùng query userId
[ ] Gateway verify token trước khi join room
[ ] User chỉ join room:user:{ownUserId}
[ ] Notification PREDICTION_SCORED được emit về đúng user
[ ] Frontend invalidate React Query khi nhận event
[ ] Polling vẫn là fallback nếu socket disconnect
[ ] CORS không mở * trong production
```

---

## 5. Checklist database/index

Thêm index nếu chưa có:

```sql
CREATE INDEX idx_predictions_user_id ON user_predictions(user_id);
CREATE INDEX idx_predictions_fixture_id ON user_predictions(fixture_id);
CREATE INDEX idx_predictions_user_fixture ON user_predictions(user_id, fixture_id);
CREATE INDEX idx_fixtures_status_scored ON fixtures(status, scored);
CREATE INDEX idx_fixtures_kickoff ON fixtures(kickoff);
```

Tên bảng có thể khác. Hãy kiểm tra entity/migration trước khi viết migration.

---

## 6. Prompt mẫu cho AI/code agent

Dùng prompt này khi muốn AI sửa từng phần:

```txt
Bạn là senior full-stack engineer. Hãy đọc source code hiện tại của repo football-verse, không dựa vào README/Markdown cũ.

Nhiệm vụ: <điền PR cần làm>

Ràng buộc:
- Không rewrite toàn bộ.
- Sửa nhỏ, đúng kiến trúc hiện tại.
- Không phá API đang được frontend/core/gateway sử dụng.
- Backend phải validate rule quan trọng.
- Nếu sửa scoring/prediction phải thêm test.
- Nếu thêm DB field/constraint phải thêm migration.
- Không hard-code secret/token.
- Không dùng userId từ client query để xác thực realtime.

Sau khi sửa, hãy báo cáo:
1. File đã đọc
2. File đã sửa
3. Lý do sửa
4. Cách test
5. Rủi ro còn lại
```

---

## 7. Prompt cho PR 1

```txt
Đọc source code hiện tại của football-verse. Không đọc README/Markdown để hiểu dự án.

Hãy sửa luồng sync fixture/result để khi prediction-service trả status "result", core-service lưu đúng status "result" thay vì ép thành "upcoming".

Yêu cầu:
- Sửa FixtureService.
- Giữ API hiện tại.
- Không rewrite toàn service.
- Thêm helper statusOf nếu phù hợp.
- Đảm bảo ScoringScheduler có thể tìm fixture status=result và scored=false.
- Nếu có test phù hợp thì thêm test.

Báo cáo lại file đã sửa và cách test.
```

---

## 8. Prompt cho PR 2

```txt
Đọc source code hiện tại của football-verse. Không dựa vào README/Markdown cũ.

Hãy bổ sung rule prediction:
- User không được tạo prediction sau fixture.kickoff.
- User không được sửa prediction sau fixture.kickoff.
- Một user chỉ được có một prediction cho một fixture.

Yêu cầu:
- Validate ở backend service layer.
- Thêm unique constraint bằng migration.
- Chuẩn hóa error code: PREDICTION_CLOSED, PREDICTION_ALREADY_EXISTS.
- Thêm unit/integration test nếu project đang có test setup.

Báo cáo lại file đã sửa, migration đã thêm, và cách test.
```

---

## 9. Prompt cho PR 3

```txt
Đọc source code hiện tại của football-verse. Không dựa vào README/Markdown cũ.

Hãy làm scoring transaction-safe:
- Lock fixture khi scoreFixture chạy.
- Không chấm nếu fixture.scored=true.
- Không chấm nếu status != result.
- Không chấm nếu thiếu homeScore/awayScore.
- Thêm prediction_score_logs để giải thích điểm từng prediction.

Yêu cầu:
- Dùng transaction.
- Thêm migration cho bảng log nếu chưa có.
- Không làm thay đổi rule điểm hiện tại trừ khi cần sửa bug.
- Thêm test cho scoring.

Báo cáo lại file đã sửa và cách test.
```

---

## 10. Prompt cho PR 4

```txt
Đọc source code hiện tại của football-verse. Không dựa vào README/Markdown cũ.

Hãy thêm notification realtime khi prediction được chấm điểm.

Yêu cầu:
- Thêm NotificationType.PREDICTION_SCORED.
- Trong ScoringService, sau khi tính điểm cho prediction, tạo notification cho user.
- Gateway đang dùng Redis + Socket.IO, tận dụng cơ chế hiện có.
- Frontend nhận notification type PREDICTION_SCORED thì invalidate predictions/stats/leaderboard.
- Không phá notification hiện tại của forum/news.

Báo cáo lại file đã sửa và cách test.
```

---

## 11. Prompt cho PR 5

```txt
Đọc source code hiện tại của football-verse. Không dựa vào README/Markdown cũ.

Hãy bảo mật gateway Socket.IO:
- Không cho client truyền userId qua query để join room.
- Client phải gửi JWT qua socket.handshake.auth.token.
- Gateway verify JWT bằng JWT_SECRET.
- User chỉ được join room:user:{ownUserId} từ token.
- CORS socket lấy từ CORS_ORIGIN, không dùng * trong production.

Yêu cầu:
- Sửa gateway-service/src/socket.ts.
- Thêm helper verify token nếu cần.
- Cập nhật web-client socket connection.
- Cập nhật docker-compose env JWT_SECRET nếu cần.
- Không hard-code secret.

Báo cáo lại file đã sửa và cách test.
```

---

## 12. Định nghĩa hoàn thành tổng thể

Một vòng hoàn thiện prediction/realtime được coi là xong khi:

```txt
- User predict trước kickoff được.
- User không predict/sửa sau kickoff được.
- Trận kết thúc thì fixture status chuyển result.
- Backend tự chấm điểm.
- Không chấm điểm lặp.
- User thấy điểm cập nhật.
- Leaderboard cập nhật.
- User nhận notification realtime.
- Socket không bị giả userId.
- Có test cho logic quan trọng.
- Repo không chứa generated files.
```

---

## 13. Ghi chú cho maintainer

Phần cần làm trước không phải refactor FastAPI hay tách crawler ngay. Những phần đó tốt, nhưng chưa phải ưu tiên số 1.

Ưu tiên thật sự là:

```txt
1. Prediction rule
2. Result sync
3. Scoring correctness
4. Realtime notification
5. Security
```

Vì đây là các phần ảnh hưởng trực tiếp đến niềm tin của user khi hệ thống có điểm/thưởng.
