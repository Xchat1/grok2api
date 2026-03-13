#!/usr/bin/env bash
# Grok2API 本地重启脚本 (macOS)，强制端口 8788
set -e
cd "$(dirname "$0")"

export SERVER_PORT="${SERVER_PORT:-8788}"

echo "停止已有进程..."
pkill -f "uv run main.py" 2>/dev/null || true
sleep 1

echo "启动服务 (端口 $SERVER_PORT)..."
exec uv run main.py
