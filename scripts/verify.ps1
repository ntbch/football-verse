param(
    [string]$Python,
    [switch]$SkipIntegratedSmoke,
    [switch]$IntegratedSmokeOnly
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$onWindows = [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT
$npmCommand = if ($onWindows) { "npm.cmd" } else { "npm" }
$mavenCommand = if ($onWindows) { "mvn.cmd" } else { "mvn" }
$fallbackPython = if ($Python) { $Python } elseif ($env:FOOTBALL_VERSE_PYTHON) { $env:FOOTBALL_VERSE_PYTHON } else { "python" }
$venvPython = if ($onWindows) { ".venv/Scripts/python.exe" } else { ".venv/bin/python" }
$predictionPython = Join-Path $repoRoot "services/prediction/$venvPython"
$matchEnginePython = Join-Path $repoRoot "services/match-engine/$venvPython"
if (-not (Test-Path -LiteralPath $predictionPython)) { $predictionPython = $fallbackPython }
if (-not (Test-Path -LiteralPath $matchEnginePython)) { $matchEnginePython = $fallbackPython }

$coreDbName = "football-verse-core-test-$PID"
$careerDbName = "football-verse-career-test-$PID"
$smokeProject = "football-verse-smoke-$PID"
$testUploadDir = Join-Path $repoRoot "scratch/test-uploads-$PID"
$matchEngineProcess = $null
$failures = [System.Collections.Generic.List[string]]::new()

function Wait-Postgres([string]$Name, [string]$User) {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        docker exec $Name pg_isready -U $User 1>$null 2>$null
        if ($LASTEXITCODE -eq 0) { return }
        Start-Sleep -Seconds 1
    }
    throw "$Name did not become ready"
}

function Start-TestInfrastructure {
    foreach ($name in @($coreDbName, $careerDbName)) {
        if (docker ps -aq --filter "name=^$name$") {
            throw "Temporary test container already exists: $name"
        }
    }

    docker run -d --rm --name $coreDbName -e POSTGRES_DB=football_verse_test -e POSTGRES_USER=football_verse_test -e POSTGRES_PASSWORD=football_verse_test -p 127.0.0.1:55634:5432 postgres:16-alpine | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not start $coreDbName" }
    docker run -d --rm --name $careerDbName -e POSTGRES_DB=match_game_test -e POSTGRES_USER=match_game_test -e POSTGRES_PASSWORD=match_game_test -p 127.0.0.1:55635:5432 postgres:16-alpine | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not start $careerDbName" }
    Wait-Postgres $coreDbName "football_verse_test"
    Wait-Postgres $careerDbName "match_game_test"

    $startArgs = @{
        FilePath = $matchEnginePython
        ArgumentList = @("-m", "uvicorn", "match_engine.main:app", "--host", "127.0.0.1", "--port", "18091")
        WorkingDirectory = (Join-Path $repoRoot "services/match-engine")
        PassThru = $true
    }
    if ($onWindows) { $startArgs.WindowStyle = "Hidden" }
    $script:matchEngineProcess = Start-Process @startArgs

    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:18091/health" -TimeoutSec 2
            if ($health.status -eq "ok") { return }
        } catch { }
        Start-Sleep -Seconds 1
    }
    throw "Temporary Match Engine did not become ready"
}

function Stop-TestInfrastructure {
    if ($matchEngineProcess -and -not $matchEngineProcess.HasExited) {
        Stop-Process -Id $matchEngineProcess.Id -Force
    }
    foreach ($name in @($coreDbName, $careerDbName)) {
        if (docker ps -aq --filter "name=^$name$") {
            docker stop $name 1>$null 2>$null
        }
    }
}

function Invoke-IntegratedSmoke {
    $env:POSTGRES_PORT = "15432"
    $env:MATCH_GAME_DB_PORT = "15433"
    $env:GATEWAY_PORT = "18000"
    $env:WEB_PORT = "13000"
    $env:DB_NAME = "football_verse_smoke"
    $env:DB_USERNAME = "football_verse_smoke"
    $env:DB_PASSWORD = "smoke-db-password"
    $env:MATCH_GAME_DB_NAME = "match_game_smoke"
    $env:MATCH_GAME_DB_USER = "match_game_smoke"
    $env:MATCH_GAME_DB_PASSWORD = "smoke-career-db-password"
    $env:INTERNAL_TOKEN = "smoke-internal-token-12345"
    $env:JWT_SECRET = "smoke-jwt-secret-key-for-verification-only-12345"
    $env:APP_SEED_ENABLED = "true"
    $env:CORS_ORIGIN = "http://127.0.0.1:13000"
    $env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:18000/api/v1"
    $env:SMOKE_WEB_URL = "http://127.0.0.1:13000"
    $env:SMOKE_API_URL = "http://127.0.0.1:18000/api/v1"
    $env:PLAYWRIGHT_MODULE_PATH = Join-Path $repoRoot "services/gateway/node_modules/playwright"
    if (-not $env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH -and $onWindows) {
        $chromeCandidates = @(
            (Join-Path $env:ProgramFiles "Google/Chrome/Application/chrome.exe"),
            (Join-Path ${env:ProgramFiles(x86)} "Google/Chrome/Application/chrome.exe")
        )
        $chrome = $chromeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
        if ($chrome) { $env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = $chrome }
    }

    try {
        docker compose -p $smokeProject up -d --build postgres redis match-game-postgres match-engine game-service prediction-service core-service gateway-service web-client
        if ($LASTEXITCODE -ne 0) { throw "Could not start integrated smoke topology" }
        & $predictionPython (Join-Path $repoRoot "scripts/smoke.py") --base "http://127.0.0.1:18000" --web "http://127.0.0.1:13000"
        if ($LASTEXITCODE -ne 0) { throw "Integrated smoke failed" }
        node (Join-Path $repoRoot "scripts/browser-auth-smoke.js")
        if ($LASTEXITCODE -ne 0) { throw "Browser auth smoke failed" }
    } catch {
        docker compose -p $smokeProject logs --tail 80 gateway-service game-service match-engine
        throw
    } finally {
        docker compose -p $smokeProject down --volumes --remove-orphans 1>$null
    }
}

if ($IntegratedSmokeOnly) {
    Write-Host "`n== Integrated smoke ==" -ForegroundColor Cyan
    Invoke-IntegratedSmoke
    Write-Host "`nIntegrated smoke passed." -ForegroundColor Green
    exit 0
}

$steps = @(
    @{ Name = "Web build"; Path = "apps/web"; Command = { & $npmCommand run build } },
    @{ Name = "Web focused tests"; Path = "apps/web"; Command = { node --test --experimental-strip-types src/features/career/_navigation.test.ts src/features/matches/_playback.test.ts tests/auth-privacy.test.ts } },
    @{ Name = "Gateway"; Path = "services/gateway"; Command = { & $npmCommand test } },
    @{ Name = "Content Ingestion"; Path = "services/content-ingestion"; Command = { & $npmCommand test } },
    @{ Name = "Core API"; Path = "services/core-api"; Command = { & $mavenCommand test } },
    @{ Name = "Career API"; Path = "services/career"; Command = { & $mavenCommand "-DrunPostgresIntegrationTests=true" test } },
    @{ Name = "Prediction"; Path = "services/prediction"; Command = { & $predictionPython -m pytest -q -p no:cacheprovider } },
    @{ Name = "Match engine"; Path = "services/match-engine"; Command = { & $matchEnginePython -m pytest -q -p no:cacheprovider } },
    @{ Name = "Compose config"; Path = "."; Command = { docker compose config --quiet } },
    @{ Name = "Recovery rehearsal"; Path = "."; Command = { & (Join-Path $PSScriptRoot "recovery_rehearsal.ps1") } }
)

try {
    Start-TestInfrastructure
    $env:DB_URL = "jdbc:postgresql://127.0.0.1:55634/football_verse_test"
    $env:DB_USERNAME = "football_verse_test"
    $env:DB_PASSWORD = "football_verse_test"
    $env:APP_SEED_ENABLED = "false"
    $env:APP_UPLOAD_DIR = $testUploadDir
    $env:MATCH_GAME_DB_URL = "jdbc:postgresql://127.0.0.1:55635/match_game_test"
    $env:MATCH_GAME_DB_USER = "match_game_test"
    $env:MATCH_GAME_DB_PASSWORD = "match_game_test"
    $env:MATCH_ENGINE_URL = "http://127.0.0.1:18091"
    $env:INTERNAL_TOKEN = "test-internal-token-12345"
    $env:JWT_SECRET = "test-jwt-secret-key-for-unit-testing-only-12345"

    foreach ($step in $steps) {
        Write-Host "`n== $($step.Name) ==" -ForegroundColor Cyan
        Push-Location (Join-Path $repoRoot $step.Path)
        try {
            & $step.Command
            if ($LASTEXITCODE -ne 0) { $failures.Add($step.Name) }
        } catch {
            Write-Error $_ -ErrorAction Continue
            $failures.Add($step.Name)
        } finally {
            Pop-Location
        }
    }
} finally {
    Stop-TestInfrastructure
    if (Test-Path -LiteralPath $testUploadDir) {
        $scratchRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot "scratch"))
        $resolvedUploadDir = [System.IO.Path]::GetFullPath($testUploadDir)
        if ([System.IO.Path]::GetDirectoryName($resolvedUploadDir) -ne $scratchRoot -or
            [System.IO.Path]::GetFileName($resolvedUploadDir) -ne "test-uploads-$PID") {
            throw "Refusing to clean an unexpected upload test path"
        }
        Remove-Item -LiteralPath $resolvedUploadDir -Recurse -Force
    }
}

if (-not $SkipIntegratedSmoke -and $failures.Count -eq 0) {
    Write-Host "`n== Integrated smoke ==" -ForegroundColor Cyan
    try {
        Invoke-IntegratedSmoke
    } catch {
        Write-Error $_ -ErrorAction Continue
        $failures.Add("Integrated smoke")
    }
}

if ($failures.Count -gt 0) {
    throw "Verification failed: $($failures -join ', ')"
}

Write-Host "`nAll verification steps passed." -ForegroundColor Green
