# Phase 1 Smoke Notes

Last run: 2026-07-04 12:04 Asia/Bangkok.

## Commands

```powershell
docker compose up -d postgres
mvn test
mvn -DskipTests clean test-compile
npm.cmd run build
npx.cmd next build --debug
npx.cmd tsc --noEmit --incremental false
```

## Results

- PostgreSQL was reachable at `127.0.0.1:55432`; Flyway connected to PostgreSQL 16.14 during backend tests.
- `mvn test`: passed, 26 tests run, 0 failures, 0 errors.
- `mvn -DskipTests clean test-compile`: passed on the earlier 11:52 run.
- `npm.cmd run build`: started Next.js 15.5.20, then produced no further output for more than 3 minutes; the hanging Node build processes were stopped.
- `npx.cmd next build --debug`: also stopped after hanging after the Next.js banner.
- `npx.cmd tsc --noEmit --incremental false`: passed on the earlier 11:52 run.

## Close Status

Backend verification is green. Phase 1 is not fully green until `npm.cmd run build` completes successfully.
