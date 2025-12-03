Param()

$ErrorActionPreference = "Stop"

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetDir  = Join-Path $ScriptRoot "..\NTUB-B-DEV"

$repoUrl   = "https://github.com/Yrchen1001/NTUB-B-DEV.git"

Write-Host "=== NTUB-B setup and run (Windows) ==="

# 0. Check required tools
$required = @("git", "node", "npm")
foreach ($cmd in $required) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: Command not found: $cmd" -ForegroundColor Red
        exit 1
    }
}

# 1. Clone or update repository
$gitFolder = Join-Path $targetDir ".git"

if (-not (Test-Path $gitFolder)) {
    Write-Host "[1/3] Cloning repository to $targetDir ..."
    git clone $repoUrl $targetDir

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $gitFolder)) {
        Write-Host "ERROR: git clone failed." -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "[1/3] Repository already exists. Running git pull ..."
    Set-Location $targetDir
    git pull --ff-only
}

# 2. Change directory to target
if (-not (Test-Path $targetDir)) {
    Write-Host "ERROR: Target path does not exist: $targetDir" -ForegroundColor Red
    exit 1
}

Set-Location $targetDir

# 3. Run local startup script
$runLocal = Join-Path $targetDir "run-local.ps1"

if (-not (Test-Path $runLocal)) {
    Write-Host "ERROR: run-local.ps1 not found." -ForegroundColor Red
    exit 1
}

Write-Host "[2/3] Running run-local.ps1 ..."

try {
    & $runLocal
}
catch {
    Write-Host "ERROR: run-local.ps1 execution failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkRed
    exit 1
}

Write-Host "[3/3] All steps finished."
