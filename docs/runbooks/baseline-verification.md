# Baseline Verification Runbook

Date: 2026-07-22

## Purpose

Run the pre-refactor behavioral gate without reading or mutating development
databases. The command builds the web app, runs every current service test suite,
checks Compose, and tears down exact-name temporary infrastructure.

## Prerequisites

- Docker Desktop/Engine is running.
- Node, npm, Java, and Maven are available.
- Python dependencies are installed in the Prediction and Match Engine local
  `.venv` directories, or a compatible Python executable is supplied.
- Repository dependencies were installed beforehand; normal verification does
  not download packages.

## Run

From the repository root:

```powershell
./scripts/verify.ps1
```

Use an explicit Python only when service-local virtual environments are absent:

```powershell
./scripts/verify.ps1 -Python C:\path\to\python.exe
```

Expected final line:

```text
All verification steps passed.
```

## Isolation Guarantees

The runner creates PostgreSQL containers named
`football-verse-core-test-<PID>` and `football-verse-career-test-<PID>` on loopback
ports 55434 and 55435. It disables Core seed data, uses generated test users,
redirects uploads to `scratch/test-uploads-<PID>`, starts a temporary Match
Engine on loopback port 18091, and removes the generated upload directory.

Cleanup targets only the recorded Match Engine process ID and those two exact
container names. The command never falls back to the development databases on
ports 55432/55433.

## Failure Handling

1. Read the final `Verification failed: ...` list; do not infer success from an
   earlier suite.
2. Re-run the named service-local command with the same isolated environment.
3. If the runner was interrupted, verify no exact-name test container or process
   on port 18091 remains before retrying.
4. Do not delete volumes, development containers, uploads, or caches as part of
   diagnosis.
5. A skipped persistence suite is a failed gate even when the test command exits
   successfully.

## Current Matrix

| Step | Expected baseline |
|---|---:|
| Web production build | pass, 24 routes generated |
| Web focused tests | 6/6 |
| Gateway tests | 14/14 |
| Content Ingestion tests | 5/5 |
| Core API tests | 49/49 |
| Career tests | 30/30 including PostgreSQL |
| Prediction tests | 8/8 |
| Match Engine tests | 30/30 |
| Compose config | pass |
| Synthetic database/upload recovery rehearsal | pass |

The same command finishes with a production-shaped smoke covering web, auth,
news, forum, Prediction, Career, refresh, logout, browser reload, and Back
privacy in an isolated Compose project.

## Replay failed ingestion

Build the worker, then requeue a bounded number of terminal failures:

```powershell
Set-Location services/content-ingestion
npm run build
npm run replay-failed -- 100
```

The command requires `INGESTION_DB_URL`, caps the requested batch at 10,000,
and logs only the count. The normal leased worker retry path processes the
requeued rows; do not edit spool state directly.
