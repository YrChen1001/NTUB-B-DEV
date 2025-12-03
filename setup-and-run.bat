@echo off
REM NTUB-B 一鍵安裝與啟動 (Windows) - .bat 封裝，實際邏輯在 script\setup-and-run.ps1

powershell -ExecutionPolicy Bypass -File "%~dp0script\setup-and-run.ps1"

echo.
echo 服務已結束。按任意鍵關閉視窗...
pause >nul


