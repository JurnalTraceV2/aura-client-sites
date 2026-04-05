@echo off
setlocal
title Aura Client - Production Deployer

echo.
echo ========================================
echo   AURA CLIENT PRODUCTION DEPLOYER
echo ========================================
echo.

:: Check if vercel is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Vercel CLI is not installed. 
    echo Please run: npm install -g vercel
    pause
    exit /b 1
)

echo [1/2] Synchronizing artifacts and metadata...
call npm run prepare:artifacts
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to synchronize artifacts. 
    echo Deployment aborted.
    pause
    exit /b 1
)

echo.
echo.
echo [2/2] Deploying to Vercel (Production)...
call vercel --prod --yes
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Vercel deployment failed.
    echo.
    echo Попробуйте выполнить команду: vercel login
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
pause
