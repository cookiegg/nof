#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
cd "$ROOT_DIR"

log() { echo -e "[nof] $*"; }

# 1) 检查 Node.js（>=18）
need_node=0
if ! command -v node >/dev/null 2>&1; then
  need_node=1
else
  v=$(node -v | sed 's/^v//;s/\..*$//')
  if [ "$v" -lt 18 ]; then need_node=1; fi
fi

if [ "$need_node" -eq 1 ]; then
  log "未检测到可用 Node.js，将使用 nvm 安装 LTS 版本（需要网络）"
  if ! command -v curl >/dev/null 2>&1; then
    log "缺少 curl，请先安装 curl 再重试"; exit 1
  fi
  export NVM_DIR="$HOME/.nvm"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  fi
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm use --lts
fi

# 2) 准备 config.json（如不存在则创建示例）
if [ ! -f "$ROOT_DIR/config.json" ]; then
  log "未发现 config.json，创建示例配置（请稍后自行填入密钥）"
  cat > "$ROOT_DIR/config.json" <<'JSON'
{
  "env": {
    "NEXT_PUBLIC_URL": "http://localhost:3000",
    "DASHSCOPE_API_KEY_1": "sk-xxx",
    "HTTPS_PROXY": "",
    "HTTP_PROXY": "",
    "NO_PROXY": "localhost,127.0.0.1",
    "TRADING_ENV": "demo-futures",
    "BINANCE_API_KEY_DEMO_FUTURES": "",
    "BINANCE_API_SECRET_DEMO_FUTURES": "",
    "BINANCE_DEMO": "true",
    "BINANCE_DEMO_FUTURES_BASE_URL": "https://demo-fapi.binance.com",
    "BINANCE_API_KEY_TEST_SPOT": "",
    "BINANCE_API_SECRET_TEST_SPOT": "",
    "BINANCE_TEST": "true"
  }
}
JSON
  log "已生成 $ROOT_DIR/config.json，请根据 README 填写键值。"
fi

# 3) 安装依赖
log "安装后端依赖…"
cd "$ROOT_DIR/backend" && npm install --silent
log "安装前端依赖…"
cd "$ROOT_DIR/web" && npm install --silent

# 4) 关闭残留进程
log "清理旧进程…"
pkill -f 'node --watch src/server.js' >/dev/null 2>&1 || true
pkill -f 'next dev' >/dev/null 2>&1 || true
pkill -f 'node .*next' >/dev/null 2>&1 || true

# 5) 启动服务（后台）
log "启动后端(http://localhost:3001)…"
cd "$ROOT_DIR/backend" && nohup npm run dev >/tmp/nof-backend.log 2>&1 &
sleep 1
log "启动前端(http://localhost:3000)…"
cd "$ROOT_DIR/web" && nohup npm run dev >/tmp/nof-web.log 2>&1 &

sleep 2
log "后端日志: /tmp/nof-backend.log"
log "前端日志: /tmp/nof-web.log"
log "打开 http://localhost:3000 即可使用"


