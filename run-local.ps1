Param()

$ErrorActionPreference = "Stop"

# 專案根目錄（這支腳本所在的位置）
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== NTUB-B 本機一鍵啟動 (Windows) ===`n"

#################################
# 1. 準備 Backend（安裝依賴 + build）
#################################
Write-Host "[1/3] 準備 Backend..."
Set-Location (Join-Path $RootDir "Backend")

if (-not (Test-Path "node_modules")) {
  Write-Host "  - 偵測到尚未安裝依賴，執行 npm ci..."
  npm ci
} else {
  Write-Host "  - 已有 node_modules，略過安裝依賴。"
}

Write-Host "  - 編譯 TypeScript -> dist/..."
npm run build

#################################
# 2. 準備 Frontend（安裝依賴）
#################################
Write-Host ""
Write-Host "[2/3] 準備 Frontend..."
Set-Location (Join-Path $RootDir "Frontend")

if (-not (Test-Path "node_modules")) {
  Write-Host "  - 偵測到尚未安裝依賴，執行 npm ci..."
  npm ci
} else {
  Write-Host "  - 已有 node_modules，略過安裝依賴。"
}

#################################
# 3. 啟動 Backend + Frontend 伺服器
#################################
Write-Host ""
Write-Host "[3/3] 啟動服務..."

# 啟動 Backend
$backendDir = Join-Path $RootDir "Backend"
Write-Host "  - 啟動 Backend (http://localhost:4000)..."
$backendProc = Start-Process "npm" "start" -WorkingDirectory $backendDir -PassThru

# 啟動 Frontend
$frontendDir = Join-Path $RootDir "Frontend"
Write-Host "  - 啟動 Frontend (http://localhost:3000)..."
$frontendProc = Start-Process "npm" "run dev" -WorkingDirectory $frontendDir -PassThru

Write-Host ""
Write-Host "=== 已啟動完成 ==="
Write-Host "前端：  http://localhost:3000"
Write-Host "後端：  http://localhost:4000/api/health"
Write-Host ""
Write-Host "關閉這個視窗或按 Ctrl + C 時，會嘗試一併關閉前後端服務。"

# 嘗試自動開啟預設瀏覽器
try {
  Start-Process "http://localhost:3000" | Out-Null
} catch {
  # 忽略開瀏覽器失敗
}

try {
  # 等待任一個子行程結束（使用者通常會直接關視窗）
  Wait-Process -Id $backendProc.Id, $frontendProc.Id
} finally {
  Write-Host ""
  Write-Host "正在關閉服務..."
  foreach ($p in @($backendProc, $frontendProc)) {
    if ($null -ne $p -and -not $p.HasExited) {
      try { $p.Kill() } catch {}
    }
  }
  Write-Host "已關閉。"
}


