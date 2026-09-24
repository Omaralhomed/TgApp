#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  Telexa Cloud - Linux VPS One-Click Deployment"
echo "========================================================"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "[!] Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo "[!] Installing Docker Compose plugin..."
    apt-get update && apt-get install -y docker-compose-plugin
fi

echo "[*] Building and starting all Docker services..."
docker compose up -d --build

echo "[*] Waiting for PostgreSQL database initialization (8s)..."
sleep 8

echo "[*] Running database schema migrations..."
docker compose exec -T backend npx prisma migrate deploy

echo "[*] Seeding default SuperAdmin account..."
docker compose exec -T backend npm run db:seed

echo ""
echo "========================================================"
echo "  [SUCCESS] Deployment Completed Successfully!"
echo "========================================================"
echo "  Production URL:     https://telexa.emt.lt"
echo "  Local IP Address:   http://$(hostname -I | awk '{print $1}')"
echo "  Default SuperAdmin: admin@telegram-saas.com"
echo "  Default Password:   AdminPass2026!"
echo "========================================================"
