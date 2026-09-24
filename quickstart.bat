@echo off
title Telegram Cloud OS - Production Quickstart
echo ========================================================
echo   Telegram Cloud OS - Production Cloud Launcher
echo ========================================================
echo.

echo [*] Checking Docker daemon status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and run this script again.
    pause
    exit /b 1
)

echo [*] Building and launching containers in background (PostgreSQL 16, Redis 7, Backend, Frontend, Nginx, Certbot)...
docker compose up -d --build

echo [*] Waiting for PostgreSQL database to be healthy...
timeout /t 8 /nobreak >nul

echo [*] Running database migrations...
docker compose exec -T backend npx prisma migrate deploy

echo [*] Seeding default SuperAdmin account (admin@telegram-saas.com)...
docker compose exec -T backend npm run db:seed

echo.
echo ========================================================
echo   [SUCCESS] Telegram Cloud OS is running!
echo ========================================================
echo   Web Application: http://localhost (or http://localhost:3000)
echo   Backend API:     http://localhost:4000
echo.
echo   SuperAdmin Login:
echo     Email:    admin@telegram-saas.com
echo     Password: AdminPass2026!
echo.
echo   Press any key to view live backend logs (Ctrl+C to exit)...
pause >nul
docker compose logs -f backend
