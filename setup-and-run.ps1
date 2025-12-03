Param()

$ErrorActionPreference = "Stop"

$repoUrl   = "https://github.com/Yrchen1001/NTUB-B-DEV.git"
$targetDir = Join-Path $env:USERPROFILE "NTUB-B-DEV"

Write-Host "=== NTUB-B 一鍵安裝與啟動 (Windows) ===`n"

##########################
# 0. 檢查必要工具
##########################

$required = @("git", "node", "npm")
foreach ($cmd in $required) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "錯誤：找不到指令 '$cmd'，請先安裝 $cmd 後再執行本腳本。" -ForegroundColor Red
    exit 1
  }
}

##########################
# 1. 下載或更新專案程式碼
##########################

if (-not (Test-Path (Join-Path $targetDir ".git"))) {
  Write-Host "[1/3] 下載專案程式碼到 $targetDir ..."
  git clone $repoUrl $targetDir
} else {
  Write-Host "[1/3] 專案已存在於 $targetDir，執行 git pull 更新..."
  Set-Location $targetDir
  try {
    git pull --ff-only
  } catch {
    Write-Host "git pull 失敗，請手動檢查後再重試。" -ForegroundColor Yellow
  }
}

Set-Location $targetDir

##########################
# 2. 呼叫本機啟動腳本
##########################

$runLocal = Join-Path $targetDir "run-local.ps1"
if (-not (Test-Path $runLocal)) {
  Write-Host "錯誤：找不到 run-local.ps1，請確認專案完整性。" -ForegroundColor Red
  exit 1
}

Write-Host "[2/3] 準備並啟動 Backend / Frontend ..."
Write-Host ""

& $runLocal


