param(
    [int]$DurationSeconds = 900,
    [int]$Workers = 16,
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$onWindows = [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT
$venvPython = if ($onWindows) { ".venv/Scripts/python.exe" } else { ".venv/bin/python" }
$python = Join-Path $repoRoot "services/prediction/$venvPython"
if (-not (Test-Path -LiteralPath $python)) { $python = "python" }
$project = "football-verse-performance-$PID"

$env:POSTGRES_PORT = "15442"
$env:MATCH_GAME_DB_PORT = "15443"
$env:GATEWAY_PORT = "18100"
$env:WEB_PORT = "13100"
$env:DB_NAME = "football_verse_performance"
$env:DB_USERNAME = "football_verse_performance"
$env:DB_PASSWORD = "performance-db-password"
$env:MATCH_GAME_DB_NAME = "match_game_performance"
$env:MATCH_GAME_DB_USER = "match_game_performance"
$env:MATCH_GAME_DB_PASSWORD = "performance-career-db-password"
$env:INTERNAL_TOKEN = "performance-internal-token-12345"
$env:JWT_SECRET = "performance-jwt-secret-key-for-verification-only-12345"
$env:APP_SEED_ENABLED = "true"
    $env:CORS_ORIGIN = "http://localhost:3000"

Push-Location $repoRoot
try {
    docker compose --progress quiet -p $project up -d --build postgres redis match-game-postgres match-engine game-service prediction-service core-service gateway-service web-client
    if ($LASTEXITCODE -ne 0) { throw "Could not start performance topology" }
    & $python scripts/smoke.py --base "http://127.0.0.1:18100" --web "http://127.0.0.1:13100"
    if ($LASTEXITCODE -ne 0) { throw "Topology readiness smoke failed" }
    docker compose -p $project cp scripts/performance_seed.sql postgres:/tmp/performance_seed.sql
    docker compose -p $project exec -T postgres psql -U $env:DB_USERNAME -d $env:DB_NAME -f /tmp/performance_seed.sql
    if ($LASTEXITCODE -ne 0) { throw "Performance data seed failed" }
    $workloadArgs = @("scripts/performance_baseline.py", "--base", "http://127.0.0.1:18100", "--duration", $DurationSeconds, "--workers", $Workers)
    if ($OutputPath) { $workloadArgs += @("--output", (Join-Path $repoRoot $OutputPath)) }
    & $python @workloadArgs
    if ($LASTEXITCODE -ne 0) { throw "Performance workload failed" }
} finally {
    docker compose -p $project down --volumes --remove-orphans 1>$null
    Pop-Location
}
