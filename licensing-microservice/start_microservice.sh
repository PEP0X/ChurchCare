#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "============================================================"
echo "  🛡️  ChurchCare Licensing Microservice & Svelte Dashboard"
echo "============================================================"
echo ""

cleanup() {
    echo ""
    echo "[*] Stopping microservice and dashboard..."
    kill 0
}
trap cleanup EXIT INT TERM

# 1. Start Rust Backend Server on port 4040
echo "[*] Starting Rust Backend Microservice on port 4040..."
(cd "$DIR/server" && cargo run) &

# Wait 2 seconds for server initialization
sleep 2

# 2. Start Svelte 5 Dashboard on port 5173
echo "[*] Starting Svelte 5 Dashboard on port 5173..."
(cd "$DIR/dashboard" && bun run dev -- --open)
