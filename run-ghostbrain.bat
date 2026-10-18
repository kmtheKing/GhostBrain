@echo off
title GhostBrain Core Engine v0.0.1
cd /d "%~dp0"

echo ====================================================================
echo               GHOSTBRAIN CORE ENGINE (v0.0.1)                      
echo     Local-First Second Brain - Vector + FTS5 Hybrid Search         
echo ====================================================================
echo.

if not exist "apps\desktop\out\main\index.js" (
    echo [Setup] Building packages and desktop bundle...
    call pnpm build
    if %errorlevel% neq 0 (
        echo [Error] Build failed. Please check error output above.
        pause
        exit /b 1
    )
)

echo [Launch] Starting GhostBrain Desktop Window...
cd apps\desktop
call npx electron .
if %errorlevel% neq 0 (
    echo.
    echo [Notice] Electron exited. Press any key to close this terminal.
    pause
)
