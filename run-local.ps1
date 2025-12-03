Param()

$ErrorActionPreference = "Stop"

# Project root (this script's directory)
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== NTUB-B local one-click start (Windows) ===`n"

#################################
# 1. Prepare Backend
#################################
Write-Host "[1/3] Preparing backend..."
$backendDir = Join-Path $RootDir "Backend"

if (-not (Test-Path $backendDir)) {
    Write-Host "ERROR: Backend directory not found: $backendDir" -ForegroundColor Red
    exit 1
}

Set-Location $backendDir

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies (npm install) ..."
    npm install
} else {
    Write-Host "Backend dependencies already installed. Skipping npm install."
}

#################################
# 2. Prepare Frontend
#################################
Write-Host "[2/3] Preparing frontend..."
$frontendDir = Join-Path $RootDir "Frontend"

if (-not (Test-Path $frontendDir)) {
    Write-Host "ERROR: Frontend directory not found: $frontendDir" -ForegroundColor Red
    exit 1
}

Set-Location $frontendDir

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies (npm install) ..."
    npm install
} else {
    Write-Host "Frontend dependencies already installed. Skipping npm install."
}

#################################
# 3. Start Backend & Frontend dev servers
#################################
Write-Host "[3/3] Starting backend and frontend dev servers..."

$backendDir = Join-Path $RootDir "Backend"
$frontendDir = Join-Path $RootDir "Frontend"

Set-Location $RootDir

$backendProc  = $null
$frontendProc = $null

try {
    # Start backend dev server in a new PowerShell window
    $backendProc = Start-Process -FilePath "powershell" `
        -ArgumentList "-NoExit", "-Command", "Set-Location `"$backendDir`"; npm run dev" `
        -PassThru

    # Start frontend dev server in a new PowerShell window
    $frontendProc = Start-Process -FilePath "powershell" `
        -ArgumentList "-NoExit", "-Command", "Set-Location `"$frontendDir`"; npm run dev" `
        -PassThru

    Write-Host ""
    Write-Host "Backend  PID : $($backendProc.Id)"
    Write-Host "Frontend PID : $($frontendProc.Id)"
    Write-Host ""
    Write-Host "Two PowerShell windows have been started for backend and frontend."
    Write-Host "Stop the dev servers or close those windows when you are done."

    # Wait until one of the dev processes exits
    Wait-Process -Id $backendProc.Id, $frontendProc.Id
}
finally {
    Write-Host ""
    Write-Host "Cleaning up dev server processes (if still running)..."

    foreach ($p in @($backendProc, $frontendProc)) {
        if ($null -ne $p -and -not $p.HasExited) {
            try {
                $p.Kill()
            } catch {
                # ignore any errors when killing processes
            }
        }
    }

    Write-Host "Cleanup finished."
}
