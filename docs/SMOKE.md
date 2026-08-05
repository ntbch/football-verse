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

The aggregate command requires Docker and the Prediction Python dependencies. It
creates an isolated temporary PostgreSQL database, redirects uploads to scratch
space, and cleans them up. It never falls back to a development database. It
then builds an isolated Compose project, runs the global
web/auth/news/forum/prediction/Minigame smoke, and runs a headless Chromium check
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

## Integrated Football Daily smoke

Required services:

```powershell
docker compose up -d postgres redis prediction-service core-service gateway-service web-client
```

Run the API smoke:

```powershell
python scripts/smoke.py
```
