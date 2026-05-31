@echo off
title CampusMart Setup
echo.
echo ╔════════════════════════════════════════╗
echo ║    📚 CampusMart — Setup Script        ║
echo ╚════════════════════════════════════════╝
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found!
    echo    Download from: https://nodejs.org  ^(choose LTS version^)
    echo    After installing Node.js, run this script again.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo ✅ Node.js %%i found

:: Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm not found. Please reinstall Node.js
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do echo ✅ npm %%i found

echo.
echo 📦 Installing all dependencies (React, Firebase, Cloudinary etc.)...
echo    This may take 2-3 minutes on first run...
echo.
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ npm install failed! Check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo ✅ All packages installed successfully!
echo.

:: Create .env if missing
if not exist ".env" (
    echo ⚙️  Creating .env file from template...
    copy .env.example .env >nul
    echo.
    echo ┌─────────────────────────────────────────────────────┐
    echo │  ⚠️  IMPORTANT: Fill in your API keys in .env file   │
    echo │                                                       │
    echo │  1. Open the .env file in this folder               │
    echo │  2. Firebase keys:                                   │
    echo │     → console.firebase.google.com                   │
    echo │     → Project Settings → Your Apps → Web            │
    echo │  3. Cloudinary keys:                                 │
    echo │     → cloudinary.com → Dashboard                    │
    echo │     → Settings → Upload → Upload Presets            │
    echo └─────────────────────────────────────────────────────┘
    echo.
    echo Opening .env file for you to edit...
    start notepad .env
    echo.
    pause
)

echo.
echo 🚀 Starting CampusMart...
echo    App will open at: http://localhost:3000
echo.
call npm start
