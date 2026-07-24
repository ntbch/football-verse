# Upload Backup and Restore

Date: 2026-07-22  
Owner: Core API

Compose stores uploaded bytes in the `core_uploads` volume and metadata in Core
PostgreSQL. Both must use the same recovery point.

## Contract

- Snapshot or archive `core_uploads` daily to encrypted storage outside the
  Docker host; retain 7 daily, 5 weekly, and 12 monthly copies.
- Record file count, total bytes, and a SHA-256 manifest. Do not log filenames
  when they may contain private data.
- Current RPO: 24 hours. Current RTO: 4 hours.
- Before the first deployment using `core_uploads`, inventory and copy any
  existing deployment upload directory; never assume an empty new volume means
  there was no prior data.

## Restore

1. Stop upload writes and select the upload artifact matching the chosen Core
   database recovery point.
2. Restore into a new volume or directory, not over the only copy.
3. Recompute the manifest and compare file count, byte count, and checksums.
4. Start Core against the restored database and upload location; verify a small
   authorized sample through the application, not by publishing raw files.
5. Switch the mount only after verification and retain the previous volume
   read-only until incident closure.

`./scripts/recovery_rehearsal.ps1` includes a generated-file archive/restore
checksum check and never reads product uploads.
