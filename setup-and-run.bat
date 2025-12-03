@echo off
setlocal

rem NTUB-B one-click setup and run (Windows)
rem Logic is in script\setup-and-run.ps1

rem Get directory of this batch file (ends with backslash)
set "SCRIPT_DIR=%~dp0"

rem Change working directory to batch file location
pushd "%SCRIPT_DIR%"

rem Check if Windows PowerShell exists
if exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
    "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT_DIR%script\setup-and-run.ps1"
) else (
    echo Cannot find Windows PowerShell:
    echo   %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe
    echo Please make sure Windows PowerShell is installed.
    echo.
    echo Press any key to close...
    pause >nul
    goto :end
)

set "PS_EXITCODE=%ERRORLEVEL%"

echo.
if not "%PS_EXITCODE%"=="0" (
    echo PowerShell script failed. Exit code: %PS_EXITCODE%
) else (
    echo Service finished successfully.
)

:end
echo.
echo Press any key to close this window...
pause >nul

popd
endlocal
