Param()

$ErrorActionPreference = "Stop"

# Project root (this script's directory)
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

#################################
# Helper: Ensure npm dependencies are up to date
#################################
function Ensure-NpmDeps {
    param(
        [Parameter(Mandatory = $true)]
        [string] $ProjectDir,
        [Parameter(Mandatory = $true)]
        [string] $Label
    )

    if (-not (Test-Path $ProjectDir)) {
        Write-Host ("[{0}] Skipping npm install: directory not found: {1}" -f $Label, $ProjectDir) -ForegroundColor Yellow
        return
    }

    $lockFile    = Join-Path $ProjectDir "package-lock.json"
    $pkgFile     = Join-Path $ProjectDir "package.json"
    $hashFile    = Join-Path $ProjectDir ".deps-hash"
    $nodeModules = Join-Path $ProjectDir "node_modules"

    # Select dependency manifest file: prefer package-lock.json, fallback to package.json
    $depFile = $null
    if (Test-Path $lockFile) {
        $depFile = $lockFile
    }
    elseif (Test-Path $pkgFile) {
        $depFile = $pkgFile
    }

    $currentHash = ""
    if ($depFile -ne $null -and (Test-Path $depFile)) {
        $currentHash = (Get-FileHash $depFile -Algorithm SHA256).Hash
    }

    $storedHash = ""
    if (Test-Path $hashFile) {
        $storedHash = (Get-Content $hashFile -Raw).Trim()
    }

    $needInstall = $false

    if (-not (Test-Path $nodeModules)) {
        $needInstall = $true
        Write-Host ("[{0}] node_modules not found; npm install required." -f $Label)
    }
    elseif ($currentHash -ne "" -and $currentHash -ne $storedHash) {
        $needInstall = $true
        Write-Host ("[{0}] Dependency manifest changed; npm install required." -f $Label)
    }
    else {
        Write-Host ("[{0}] Dependencies up to date; skipping npm install." -f $Label)
    }

    if (-not $needInstall) {
        return
    }

    Push-Location $ProjectDir
    try {
        Write-Host ("[{0}] Running npm install ..." -f $Label)
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed in $ProjectDir"
        }

        if ($currentHash -ne "") {
            Set-Content -Path $hashFile -Value $currentHash -Encoding ASCII
        }
        Write-Host ("[{0}] npm install completed." -f $Label)
    }
    finally {
        Pop-Location
    }
}

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

Ensure-NpmDeps -ProjectDir $backendDir -Label "backend"

#################################
# 2. Prepare Frontend
#################################
Write-Host "[2/3] Preparing frontend..."
$frontendDir = Join-Path $RootDir "Frontend"

if (-not (Test-Path $frontendDir)) {
    Write-Host "ERROR: Frontend directory not found: $frontendDir" -ForegroundColor Red
    exit 1
}

Ensure-NpmDeps -ProjectDir $frontendDir -Label "frontend"

#################################
# 3. Start Backend & Frontend dev servers
#################################
Write-Host "[3/3] Starting backend and frontend dev servers..."

Set-Location $RootDir

$backendProc  = $null
$frontendProc = $null

try {
    # Backend PowerShell window
    $backendProc = Start-Process -FilePath "powershell" `
        -ArgumentList "-NoExit", "-Command", "Set-Location `"$backendDir`"; npm run dev" `
        -PassThru

    # Frontend PowerShell window
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

}
finally {
    Write-Host ""
    Write-Host "Stopping dev servers..."

    foreach ($p in @($backendProc, $frontendProc)) {
        if ($null -ne $p -and -not $p.HasExited) {
            try { $p.Kill() } catch {}
        }
    }

    Write-Host "Cleanup complete."
}
