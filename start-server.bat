@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Morris game server

rem Closing the console window does not always take the server with it, which
rem leaves port 3000 held by the previous build. Clear it before starting so a
rem stale process can never quietly serve yesterday's code.
for /f "usebackq tokens=*" %%p in (`powershell -NoProfile -Command "@(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess"`) do (
  echo Stopping leftover server, PID %%p
  taskkill /PID %%p /F >nul 2>&1
)

echo Building...
call npm run build
if errorlevel 1 (
  echo.
  echo BUILD FAILED - not starting. Fix the error above, or run
  echo    node node_modules\next\dist\bin\next start
  echo to launch the previous working build.
  echo.
  pause
  exit /b 1
)

rem No pipes in this command on purpose: inside a for/f backtick block, cmd does
rem not unescape ^| before handing the string to PowerShell, so a piped version
rem fails silently and every URL below falls back to localhost.
set IP=
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "@(Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp)[0].IPAddress"`) do set IP=%%i

echo.
if "!IP!"=="" (
  echo  ===========================================================
  echo    COULD NOT DETECT THIS LAPTOP'S WI-FI ADDRESS
  echo    Run  ipconfig  and read the IPv4 Address, then open
  echo    http://THAT-ADDRESS:3000/play on the phones.
  echo  ===========================================================
) else (
  echo  ===========================================================
  echo    Open these on ANY device on this Wi-Fi:
  echo.
  echo      Host control : http://!IP!:3000/host
  echo      Projector    : http://!IP!:3000/screen
  echo      Reps' phones : http://!IP!:3000/play
  echo.
  echo    On this laptop, http://localhost:3000 also works.
  echo  ===========================================================
)
echo.
echo  Scores are saved to data\state.json - restarting loses nothing.
echo  Closing this window stops the server.
echo.

rem The server runs inside a kill-on-close job object (scripts\run-server.ps1), so
rem closing this window - or Ctrl+C, or killing this window from Task Manager - takes
rem the node process down with it instead of leaving port 3000 held by an orphan.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-server.ps1"
