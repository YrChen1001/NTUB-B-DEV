#!/usr/bin/env bash

set -e

REPO_URL="https://github.com/Yrchen1001/NTUB-B-DEV.git"
TARGET_DIR="$HOME/NTUB-B-DEV"

echo "=== NTUB-B 一鍵安裝與啟動 ==="
echo

##########################
# 0. 檢查必要工具
##########################

for cmd in git node npm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "錯誤：找不到指令 '$cmd'，請先安裝後再執行本腳本。"
    exit 1
  fi
done

##########################
# 1. 下載或更新專案程式碼
##########################

if [ ! -d "$TARGET_DIR/.git" ]; then
  echo "[1/3] 下載專案程式碼到 $TARGET_DIR ..."
  git clone "$REPO_URL" "$TARGET_DIR"
else
  echo "[1/3] 專案已存在於 $TARGET_DIR，執行 git pull 更新..."
  cd "$TARGET_DIR"
  git pull --ff-only || true
fi

cd "$TARGET_DIR"

##########################
# 2. 確保本地啟動腳本可執行
##########################

chmod +x run-local.sh

##########################
# 3. 啟動前後端
##########################

echo
echo "[2/3] 準備並啟動服務（Backend + Frontend）..."
./run-local.sh


