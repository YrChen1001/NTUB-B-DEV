#!/usr/bin/env bash

set -e

# 取得專案根目錄（這支腳本所在的位置）
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== NTUB-B 本機一鍵啟動 ==="
echo

#################################
# 1. 準備 Backend（安裝依賴 + build）
#################################
echo "[1/3] 準備 Backend..."
cd "$ROOT_DIR/Backend"

if [ ! -d node_modules ]; then
  echo "  - 偵測到尚未安裝依賴，執行 npm ci..."
  npm ci
else
  echo "  - 已有 node_modules，略過安裝依賴。"
fi

echo "  - 編譯 TypeScript -> dist/..."
npm run build

#################################
# 2. 準備 Frontend（安裝依賴）
#################################
echo
echo "[2/3] 準備 Frontend..."
cd "$ROOT_DIR/Frontend"

if [ ! -d node_modules ]; then
  echo "  - 偵測到尚未安裝依賴，執行 npm ci..."
  npm ci
else
  echo "  - 已有 node_modules，略過安裝依賴。"
fi

#################################
# 3. 啟動 Backend + Frontend 開發伺服器
#################################
echo
echo "[3/3] 啟動服務..."

cd "$ROOT_DIR/Backend"
echo "  - 啟動 Backend (http://localhost:4000)..."
npm start &
BACK_PID=$!

cd "$ROOT_DIR/Frontend"
echo "  - 啟動 Frontend (http://localhost:3000)..."
npm run dev &
FRONT_PID=$!

echo
echo "=== 已啟動完成 ==="
echo "前端：  http://localhost:3000"
echo "後端：  http://localhost:4000/api/health"
echo
echo "按 Ctrl + C 可同時關閉前後端服務。"

# 嘗試自動開啟瀏覽器（可在 macOS / Linux 上運作，失敗時安靜略過）
if command -v open >/dev/null 2>&1; then
  open "http://localhost:3000" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:3000" >/dev/null 2>&1 || true
fi

cleanup() {
  echo
  echo "正在關閉服務..."
  kill "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
  wait "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
  echo "已關閉。"
}

trap cleanup INT TERM

wait


