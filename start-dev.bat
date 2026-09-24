@echo off
echo ====================================================
echo Starting Telegram Cloud SaaS (Backend + Frontend)
echo ====================================================

start cmd /k "echo [1/2] Starting NestJS Backend on http://localhost:4000... && cd backend && npm run start:dev"
start cmd /k "echo [2/2] Starting Next.js Frontend on http://localhost:3000... && cd frontend && npm run dev"

echo.
echo All services launched!
echo - Frontend Dashboard: http://localhost:3000
echo - Backend API:        http://localhost:4000
echo ====================================================
