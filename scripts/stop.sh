#!/usr/bin/env bash
set -euo pipefail

echo "[nof] 停止前后端进程…"
pkill -f 'node --watch src/server.js' >/dev/null 2>&1 || true
pkill -f 'next dev' >/dev/null 2>&1 || true
pkill -f 'node .*next' >/dev/null 2>&1 || true
echo "[nof] 已尝试停止，若仍占用端口，请手动检查 lsof -iTCP:3000,3001"


