#!/usr/bin/env bash
# 在本仓库根目录启动 VitePress 开发服务器（默认 http://localhost:5173/blog/）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! command -v npm >/dev/null 2>&1; then
  echo "error: npm 未找到，请先安装 Node.js" >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "==> 未检测到 node_modules，正在执行 npm install..."
  npm install
fi

echo "==> 启动 VitePress（Ctrl+C 结束）"
exec npm run docs:dev -- "$@"
