Param()

$ErrorActionPreference = "Stop"

# Project root (this script's directory)
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

#################################
# 0. Safety: Check if ports 3000 / 4000 are already in use
#################################
function Test-PortInUse {
    param([int]$Port)
    $pattern = "[:\.]$Port\s"
    $lines = netstat -ano -p TCP 2>$null | Select-String $pattern
    return $null -ne $lines
}

$BackendPort  = 4000
$FrontendPort = 3000

$backendBusy  = Test-PortInUse -Port $BackendPort
$frontendBusy = Test-PortInUse -Port $FrontendPort

if ($backendBusy -or $frontendBusy) {
    Write-Host "A development server is already running. Startup aborted:" -ForegroundColor Yellow
    if ($backendBusy)  { Write-Host " - Backend port $BackendPort is in use."  -ForegroundColor Yellow }
    if ($frontendBusy) { Write-Host " - Frontend port $FrontendPort is in use." -ForegroundColor Yellow }
    Write-Host "Please close the existing dev server windows or kill the related node processes." -ForegroundColor Red
    exit 1
}

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

Set-Location $RootDir

$backendProc  = $null
$frontendProc = $null

try {
    # Backend powershell window
    $backendProc = Start-Process -FilePath "powershell" `
        -ArgumentList "-NoExit", "-Command", "Set-Location `"$backendDir`"; npm run dev" `
        -PassThru

    # Frontend powershell window
    $frontendProc = Start-Process -FilePath "powershell" `
        -ArgumentList "-NoExit", "-Command", "Set-Location `"$frontendDir`"; npm run dev" `
        -PassThru

    Write-Host ""
    Write-Host ("Backend  PID : {0}"  -f $backendProc.Id)
    Write-Host ("Frontend PID : {0}" -f $frontendProc.Id)
    Write-Host ""

    #################################
    # 4. Launch Chrome in app/kiosk mode (Frontend @ port 3000)
    #################################
    $chromeCandidates = @(
        "C:\Program Files\Google\Chrome\Application\chrome.exe",
        "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    )

    $chrome = $null
    foreach ($path in $chromeCandidates) {
        if (Test-Path $path) {
            $chrome = $path
            break
        }
    }

    if ($chrome -eq $null) {
        Write-Host "WARNING: Chrome not found. Skipping kiosk launch." -ForegroundColor Yellow
    } else {
        $kioskUrl = "http://localhost:3000"
        Write-Host "Launching Chrome kiosk window at: $kioskUrl"
        Start-Process $chrome "--kiosk --kiosk-printing --start-maximized --app=$kioskUrl"
    }

    #################################
    # 5. Monitoring:
    #    If user closes EITHER backend or frontend window:
    #    → stop the other one, exit this script, Chrome stays open
    #################################
    Write-Host ""
    Write-Host "Both dev servers are running."
    Write-Host "Close ANY backend or frontend PowerShell window to stop everything."

    while ($true) {
        $backendAlive  = ($backendProc  -ne $null -and -not $backendProc.HasExited)
        $frontendAlive = ($frontendProc -ne $null -and -not $frontendProc.HasExited)

        # Exit when EITHER window is closed
        if (-not $backendAlive -or -not $frontendAlive) {
            break
        }

        Start-Sleep -Seconds 1
    }

} finally {

    Write-Host ""
    Write-Host "Stopping dev servers..."

    foreach ($p in @($backendProc, $frontendProc)) {
        if ($null -ne $p -and -not $p.HasExited) {
            try { $p.Kill() } catch {}
        }
    }

    Write-Host "Cleanup complete."
}
