# Smoke checks

## Local verification

Install each service's dependencies once, then run the cross-runtime checks:

```powershell
./scripts/verify.ps1
```

If Python is not on `PATH`, pass its executable explicitly:

```powershell
./scripts/verify.ps1 -Python C:\path\to\python.exe
```

The aggregate command requires Docker and the services' Python dependencies. It
creates isolated temporary PostgreSQL databases and a Match Engine process,
redirects uploads to scratch space, and cleans them up. It never falls back to a
development database. It then builds an isolated Compose project, runs the global
web/auth/news/forum/prediction/Career smoke, and runs a headless Chromium check
for memory-only auth, cookie reload, logout, and Back navigation. The generated
test identities use `example.test`; their values and credentials are not logged.
The command removes that project's volumes on success or failure.

Browser smoke uses the Gateway's Playwright dev dependency. On Windows the
runner auto-detects Google Chrome. Other environments can install Chromium with
`npx playwright install chromium` from `services/gateway`, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing compatible executable.

The same gate also runs a synthetic recovery rehearsal. Run it alone with:

```powershell
./scripts/recovery_rehearsal.ps1
```

It verifies PostgreSQL dump/restore content and an upload archive checksum using
only generated fixtures, then removes its exact-name containers and scratch data.

For a quick service-suite rerun after the global smoke already passed:

```powershell
./scripts/verify.ps1 -SkipIntegratedSmoke
```

## Integrated Career smoke

Required services:

```powershell
docker compose up -d postgres redis match-game-postgres match-engine core-service game-service gateway-service web-client
```

Do not include `prediction-service` for Career smoke; Career uses `game-service`, `match_game_db`, and `match-engine`.

Run the API smoke:

```powershell
python scripts/career_smoke.py
```

Run a small balance report:

```powershell
python scripts/career_smoke.py --seasons 5
```

The script logs in, creates an eight-club Career, plays only managed-club fixtures, lets each response complete its AI matchday, and reports world fixture count alongside match/transfer/manager balance. It deletes the smoke save unless `--keep-save` is passed.
