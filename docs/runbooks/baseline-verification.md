# Baseline Verification Runbook

Date: 2026-08-16

## Purpose

Run the pre-refactor behavioral gate without reading or mutating development
databases. The command builds the web app, runs every current service test suite,
checks Compose, and tears down exact-name temporary infrastructure.

## Prerequisites

- Docker Desktop/Engine is running.
- Node, npm, Java, and Maven are available.
- Python dependencies are installed in the Prediction local `.venv` directory,
  or a compatible Python executable is supplied.
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

The runner creates one PostgreSQL container named
`football-verse-core-test-<PID>` on loopback port 55634. It disables Core seed
data, uses generated test users, redirects uploads to
`scratch/test-uploads-<PID>`, and removes the generated upload directory.

Cleanup targets only that exact container and the exact generated upload path.
The command never falls back to the development database.

## Failure Handling

1. Read the final `Verification failed: ...` list; do not infer success from an
   earlier suite.
2. Re-run the named service-local command with the same isolated environment.
3. If the runner was interrupted, verify no exact-name test container remains
   before retrying.
4. Do not delete volumes, development containers, uploads, or caches as part of
   diagnosis.
5. A skipped persistence suite is a failed gate even when the test command exits
   successfully.

## Current Matrix

| Step | Expected baseline |
|---|---:|
| Web lint, build, typecheck, and tests | required |
| Gateway tests | required |
| Content Ingestion tests | required |
| Core API tests | required |
| Prediction tests | required |
| Compose config | pass |
| Synthetic database/upload recovery rehearsal | pass |

The same command finishes with a production-shaped smoke covering web, auth,
news, forum, predictions, minigames, refresh, logout, browser reload, and Back
privacy in an isolated Compose project. When both `SMOKE_EMAIL` and
`SMOKE_PASSWORD` are omitted, the runner creates an ephemeral non-privileged
account in the disposable smoke database and removes it during teardown. Set
both variables only when you need to exercise a specific verified test
account; credentials are never stored in this repository.

A missing Node, Maven, Python, Docker, browser, or service-local dependency is
a failed prerequisite, not a passing or skipped verification gate. Loopback
socket tests must run in an environment that permits temporary local listeners.

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
