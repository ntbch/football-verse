# Match Engine

Stateless Football Verse match simulation service. It receives `MatchInput` and
returns `MatchResult`; it does not own a database, migrations, or user identity.

```bash
docker compose up -d match-engine
```

Health endpoint: `GET /health` on internal port `8091`.

`game-service` owns `match_game_db`, auth, persistence, and calls this service on
the internal network.
