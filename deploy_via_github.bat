@echo off
setlocal
title Aura Client - GitHub Deployer

echo.
echo ========================================
echo   AURA CLIENT GITHUB DEPLOYER
echo ========================================
echo.

:: Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed.
    pause
    exit /b 1
)

echo [1/3] Synchronizing artifacts and metadata...
call npm run prepare:artifacts

echo.
echo [2/3] Adding changes to Git...
git add .

echo.
echo [3/3] Committing and Pushing to GitHub...
:: Try to commit, but don't fail if there's nothing to commit.
git commit -m "chore: sync artifacts and update backend logic" || echo [INFO] No changes to commit.
git push

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Git push failed. 
    echo Check your connection and permissions.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   PUSH SUCCESSFUL!
echo   Vercel will redeploy automatically.
echo ========================================
echo.
pause
