@echo off
title Khiladi Battle Backend Server Launcher
echo ====================================================
echo   LAUNCHING KHILADI BATTLE BATTLEGROUND BACKEND
echo ====================================================
echo.

:: Add Firewall Rule and Set WiFi to Private (requires Administrator privileges)
netsh advfirewall firewall add rule name="Allow Khiladi Battle Port 5000" dir=in action=allow protocol=TCP localport=5000 >nul 2>&1
powershell -Command "Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private" >nul 2>&1


:: Check if Node is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed on this system!
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit
)

cd backend

:: Check if node_modules exists, if not install dependencies
if not exist node_modules (
    echo Installing backend database dependencies. Please wait...
    call npm install
    echo.
)

echo Starting Node backend server...
echo.
call npm start

pause
