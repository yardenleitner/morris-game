@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Morris game server

echo Building...
call npm run build
if errorlevel 1 (
  echo.
  echo BUILD FAILED - not starting. Fix the error above, or run "npm start" to
  echo launch the previous working build.
  echo.
  pause
  exit /b 1
)

rem Read the Wi-Fi address fresh each run: it is handed out by DHCP and changes
rem between networks, and the phones need whatever it is today.
set IP=
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.PrefixOrigin -eq 'Dhcp' -and $_.InterfaceAlias -notlike '*vEthernet*' } ^| Select-Object -First 1).IPAddress"`) do set IP=%%i
if "!IP!"=="" set IP=localhost

echo.
echo  ===========================================================
echo    Host control : http://localhost:3000/host
echo    Projector    : http://localhost:3000/screen
echo.
echo    Reps' phones : http://!IP!:3000/play
echo    (phones must be on the same Wi-Fi as this laptop)
echo  ===========================================================
echo.
echo  Scores are saved to data\state.json - closing this window or
echo  restarting does not lose the game.
echo.

call npm start
pause
