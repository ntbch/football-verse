param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceName = "football-verse-recovery-source-$PID"
$restoreName = "football-verse-recovery-restore-$PID"
$postgresImage = "postgres:16-alpine@sha256:e013e867e712fec275706a6c51c966f0bb0c93cfa8f51000f85a15f9865a28cb"
$scratchDir = Join-Path $repoRoot "scratch/recovery-$PID"
$scratchRelative = "scratch/recovery-$PID"

function Wait-Database([string]$name) {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        docker exec $name pg_isready -U rehearsal -d rehearsal 1>$null 2>$null
        if ($LASTEXITCODE -eq 0) { return }
        Start-Sleep -Seconds 1
    }
    throw "$name did not become ready"
}

Push-Location $repoRoot
try {
    foreach ($name in @($sourceName, $restoreName)) {
        if (docker ps -aq --filter "name=^$name$") {
            throw "Recovery rehearsal container already exists: $name"
        }
    }

    New-Item -ItemType Directory -Path $scratchDir | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $scratchDir "uploads-source") | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $scratchDir "uploads-source/generated.txt"), "generated recovery fixture")

    docker run -d --rm --name $sourceName -e POSTGRES_DB=rehearsal -e POSTGRES_USER=rehearsal -e POSTGRES_PASSWORD=rehearsal-password $postgresImage | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not start recovery source database" }
    docker run -d --rm --name $restoreName -e POSTGRES_DB=rehearsal -e POSTGRES_USER=rehearsal -e POSTGRES_PASSWORD=rehearsal-password $postgresImage | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not start recovery target database" }
    Wait-Database $sourceName
    Wait-Database $restoreName

    docker exec $sourceName psql -U rehearsal -d rehearsal -v ON_ERROR_STOP=1 -c "CREATE TABLE recovery_fixture (id integer PRIMARY KEY, email text NOT NULL); INSERT INTO recovery_fixture VALUES (1, 'one@example.test'), (2, 'two@example.test');" 1>$null
    if ($LASTEXITCODE -ne 0) { throw "Could not seed recovery fixture" }
    docker exec $sourceName pg_dump -U rehearsal -d rehearsal --format=custom --file=/tmp/rehearsal.dump
    if ($LASTEXITCODE -ne 0) { throw "Could not create database backup" }
    docker cp "${sourceName}:/tmp/rehearsal.dump" "$scratchRelative/rehearsal.dump" 1>$null
    if ($LASTEXITCODE -ne 0) { throw "Could not export database backup" }
    docker cp "$scratchRelative/rehearsal.dump" "${restoreName}:/tmp/rehearsal.dump" 1>$null
    if ($LASTEXITCODE -ne 0) { throw "Could not import database backup" }
    docker exec $restoreName pg_restore -U rehearsal -d rehearsal --exit-on-error /tmp/rehearsal.dump
    if ($LASTEXITCODE -ne 0) { throw "Could not restore database backup" }

    $sourceRows = docker exec $sourceName psql -U rehearsal -d rehearsal -Atc "SELECT id || ',' || email FROM recovery_fixture ORDER BY id"
    $restoredRows = docker exec $restoreName psql -U rehearsal -d rehearsal -Atc "SELECT id || ',' || email FROM recovery_fixture ORDER BY id"
    if ($LASTEXITCODE -ne 0 -or ($sourceRows -join "`n") -ne ($restoredRows -join "`n")) {
        throw "Restored database content does not match"
    }

    Compress-Archive -LiteralPath (Join-Path $scratchDir "uploads-source/generated.txt") -DestinationPath (Join-Path $scratchDir "uploads.zip")
    Expand-Archive -LiteralPath (Join-Path $scratchDir "uploads.zip") -DestinationPath (Join-Path $scratchDir "uploads-restored")
    $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $scratchDir "uploads-source/generated.txt")).Hash
    $restoredHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $scratchDir "uploads-restored/generated.txt")).Hash
    if ($sourceHash -ne $restoredHash) { throw "Restored upload checksum does not match" }

    Write-Output '{"status":"passed","databaseRows":2,"uploadFiles":1}'
} finally {
    docker stop $sourceName $restoreName 1>$null 2>$null
    if (Test-Path -LiteralPath $scratchDir) {
        $scratchRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot "scratch"))
        $resolvedScratch = [System.IO.Path]::GetFullPath($scratchDir)
        if ([System.IO.Path]::GetDirectoryName($resolvedScratch) -ne $scratchRoot -or
            [System.IO.Path]::GetFileName($resolvedScratch) -ne "recovery-$PID") {
            throw "Refusing to clean an unexpected recovery path"
        }
        Remove-Item -LiteralPath $resolvedScratch -Recurse -Force
    }
    Pop-Location
}
