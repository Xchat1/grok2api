#!/usr/bin/env bash
set -euo pipefail

# Grok2API 快速启动脚本
# 用于本地开发环境的快速启动

echo "🚀 正在启动 Grok2API..."

# 检查 uv 是否安装
if ! command -v uv &> /dev/null; then
    echo "❌ uv 未安装。请先安装 uv: https://github.com/astral-sh/uv"
    exit 1
fi

# 安装/同步依赖
echo "📦 同步依赖..."
uv sync

# 检查是否需要设置环境变量
if [ ! -f ".env" ]; then
    echo "ℹ️  建议复制 .env.example 到 .env 来配置环境变量"
    echo "   cp .env.example .env"
fi

# 启动服务
echo "🔥 启动服务..."
uv run main.py

echo "✅ Grok2API 已启动！"
echo "   管理面板: http://localhost:8788/login"
echo "   API 文档: http://localhost:8788/docs"