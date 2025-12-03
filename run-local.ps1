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

    #####################################################
    # 4. Launch Chrome kiosk app (Frontend @ port 3000)
    #    Chrome 僅啟動，不參與後續「連動關閉」邏輯
    #####################################################
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
        Write-Host "WARNING: Google Chrome not found. Skipping kiosk launch." -ForegroundColor Yellow
    } else {
        $kioskUrl = "http://localhost:3000"
        Write-Host "Launching Chrome kiosk window at: $kioskUrl"

        # 你可以視需要改成只最大化：
        #   --start-maximized --app=$kioskUrl
        Start-Process $chrome "--kiosk --kiosk-printing --start-maximized --app=$kioskUrl"
    }

    #####################################################
    # 5. 監控 Backend / Frontend 視窗：
    #    只要任一個關閉，就結束另一個並退出本腳本
    #####################################################
    Write-Host ""
    Write-Host "Backend / Frontend dev servers are running."
    Write-Host "Close EITHER backend or frontend PowerShell window to stop everything."

    while ($true) {
        $backendAlive  = ($backendProc  -ne $null -and -not $backendProc.HasExited)
        $frontendAlive = ($frontendProc -ne $null -and -not $frontendProc.HasExited)

        # 若任一邊已經不在，就跳出迴圈，進入 finally 做清理
        if (-not $backendAlive -or -not $frontendAlive) {
            break
        }

        Start-Sleep -Seconds 1
    }
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
