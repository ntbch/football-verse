# Local-First Development

## Goal

Keep every product feature available from local Docker Compose. Do not deploy or call a production runtime yet.

## Decisions

1. Delete the scheduled GitHub crawler that calls Render. Keep CI build/test checks because they do not deploy.
2. Use localhost for runtime defaults. Docker Compose remains the local service topology.
3. Keep Telegram, Gemini, Google OAuth, and Football API integrations. They are enabled only by values in the ignored local `.env` file.
4. Do not crawl on Compose startup. Enable a manual local crawl only when testing ingestion.
5. Preserve API contracts, schema, UI, local volumes, and current security boundaries.

## Configuration

`.env.example` contains no real credentials and disables Telegram by default. A developer sets local credentials and enables integrations as needed:

- `TELEGRAM_ENABLED=true`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, with `http://localhost:3000` authorized in Google OAuth
- `FOOTBALL_API_KEY`

## Constraints

One local developer, disposable local data, and optional external network calls. Services must boot when integration credentials are absent. Secrets stay in ignored `.env` files.

## Verification

Run Compose configuration, focused Gateway/Ingestion tests, Core compile, and confirm no scheduled workflow or runtime default references Render.
