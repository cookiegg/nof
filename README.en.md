# nof — AI Trading Experiment System for Multiple Markets and Models

> The alpha arena competition at **nof1.ai** just wrapped up, but as *Ghost in the Shell* reminds us, the era of “fully automated capitalism” is only beginning. Rather than watching from the shore, build the system you want to see.

Compared with other nof1-style clones, this project is positioned as a full-fledged quantitative trading lab. It delivers rich integrations for simulated trading environments plus prompt editing/reuse so you can iterate toward safer, higher-quality strategies.

- **Multiple trading environments:** Binance demo futures, testnet spot, local simulation, and live trading.
- **Model agnostic:** Switch instantly between Qwen, DeepSeek, GLM, and more via API keys or presets.
- **Prompt Studio:** Manage system/user templates per environment or per bot, tweak anytime, hot-reload immediately.
- **Parallel bots:** Run many bots at once, each with isolated accounts, conversations, and trades; compare net value curves and leaderboards.

### Who is it for?
- Researchers/developers validating combinations of “different LLM + trading venue + prompt”.
- Solo builders or small teams who need a low-friction setup (no database/queue required).

The frontend adapts the open-source **nof0** UI by [@wquguru](https://github.com/wquguru). Huge thanks to the original author.

> Crypto markets are extremely volatile and risky. Protect your capital and proceed cautiously.

---

## Interface Preview

<div align="center" style="margin-bottom: 1.5rem;">
  <img src="assets/home_page.png" alt="Overview of the trading dashboard" style="max-width: 100%; width: 860px; border: 1px solid #e5e5e5; border-radius: 8px;" />
  <p style="margin-top: 0.5rem; color: #666;">Trading dashboard: ticker, bot list, Prompt Studio Chat, and account curve</p>
</div>

<div align="center" style="margin-bottom: 1.5rem;">
  <img src="assets/add_bot.png" alt="Modal for adding a trading bot" style="max-width: 100%; width: 420px; border: 1px solid #e5e5e5; border-radius: 8px;" />
  <p style="margin-top: 0.5rem; color: #666;">Add Bot modal: choose trading mode, AI model, prompt mode, and polling interval</p>
</div>

---

## Quick Start (3 Minutes)
0) Register a Binance account (use the referral link below for fee discounts):  
   [Sign-up link](https://accounts.maxweb.red/register?ref=BEC0NPI5)

1) **Create a config file (recommended)**  
   - Copy `config.json.example` to `config.json` in the repo root and fill it in (sample below).

2) **Install & run**
```bash
# Backend
cd backend && npm install && npm run dev
# Frontend (in another terminal)
cd web && npm install && npm run dev
# Visit http://localhost:3000
```

3) **One-click scripts**
```bash
bash scripts/oneclick.sh   # Auto-check Node, install deps, launch in background
bash scripts/stop.sh       # Stop everything
```

Windows (.bat) scripts:
```bat
scripts\oneclick-win.bat   # Install deps and launch backend/frontend in new windows
scripts\stop-win.bat       # Stop dev processes (pattern match)
```

---

## What Can You Do with nof?
- Run multiple bots side by side to compare models or prompt variants.
- Edit system/user prompts on the fly to test risk rules, entry/exit logic, and stylistic preferences.
- Validate on Binance testnet/demo (“real APIs, fake funds”) or backtest via local simulated matching.
- Use charts and leaderboards to inspect equity curves, win rates, and trade distributions quickly.

---

## `config.json` Example
Place the following in the repo root as `config.json`:
```json
{
  "env": {
    "NEXT_PUBLIC_URL": "http://localhost:3000",
    "DASHSCOPE_API_KEY_1": "sk-xxx",
    "DASHSCOPE_API_KEY_2": "sk-xxx",
    "HTTPS_PROXY": "http://127.0.0.1:7890",
    "HTTP_PROXY": "http://127.0.0.1:7890",
    "NO_PROXY": "localhost,127.0.0.1",
    "TRADING_ENV": "demo-futures",
    "BINANCE_API_KEY_DEMO_FUTURES": "xxx",
    "BINANCE_API_SECRET_DEMO_FUTURES": "xxx",
    "BINANCE_DEMO": "true",
    "BINANCE_DEMO_FUTURES_BASE_URL": "https://demo-fapi.binance.com",
    "BINANCE_API_KEY_TEST_SPOT": "xxx",
    "BINANCE_API_SECRET_TEST_SPOT": "xxx",
    "BINANCE_TEST": "true",
    "BINANCE_API_KEY_LIVE_SPOT": "xxx",
    "BINANCE_API_SECRET_LIVE_SPOT": "-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----",
    "BINANCE_SPOT_BASE_URL": "https://api.binance.com",
    "BINANCE_API_KEY_LIVE_FUTURES": "xxx",
    "BINANCE_PRIVATE_SECRET_LIVE_FUTURES": "-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----",
    "BINANCE_FUTURES_BASE_URL": "https://fapi.binance.com",
    "CRON_SECRET_KEY": "xxx",
    "START_MONEY": "30"
  }
}
```

### Field Notes
- `NEXT_PUBLIC_URL`: Browser-visible frontend URL.
- `DASHSCOPE_API_KEY_1..5`: Alibaba DashScope LLM API keys (DeepSeek/Qwen/GLM/Kimi etc.). Apply for a few and assign per bot to avoid rate limits.
- `HTTPS_PROXY / HTTP_PROXY / NO_PROXY`: Network proxy config (e.g. your VPN port).
- `TRADING_ENV`: Default environment (commonly `demo-futures`, `test-spot`, or `local-simulated`).

#### Binance Demo Futures Keys
- Apply at [demo.binance.com](https://demo.binance.com); the site can auto-generate demo keys.
```
BINANCE_API_KEY_DEMO_FUTURES="xxx"
BINANCE_API_SECRET_DEMO_FUTURES="xxx"
BINANCE_DEMO=true
BINANCE_DEMO_FUTURES_BASE_URL=https://demo-fapi.binance.com
```

![](assets/demo_api_key.png)

#### Binance Spot Testnet Keys
- Follow <https://developers.binance.com/docs/binance-spot-api-docs/faqs/testnet> to apply.
```
BINANCE_API_KEY_TEST_SPOT="xxx"
BINANCE_API_SECRET_TEST_SPOT="xxx"
BINANCE_TEST=true
```

#### Binance Spot/Futures Live Keys
- Apply at <https://www.binance.com/en/binance-api>. Be sure to create self-managed keys (not system-generated) and whitelist IPs for security.
```
BINANCE_API_KEY_LIVE_SPOT="xxx"
BINANCE_API_SECRET_LIVE_SPOT="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----"
BINANCE_SPOT_BASE_URL=https://api.binance.com

BINANCE_API_KEY_LIVE_FUTURES="xxx"
BINANCE_PRIVATE_SECRET_LIVE_FUTURES="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----"
BINANCE_FUTURES_BASE_URL=https://fapi.binance.com
```
- `CRON_SECRET_KEY`: Simple shared secret for scheduled/internal triggers.
- `START_MONEY`: Default initial USDT when creating bots in local-simulated mode.

![](assets/live_api_key.png)

---

## Daily Tips
- **Start/stop:** Use the commands above or the one-click scripts.
- **Create/launch bots:** In the “Trading Control” panel choose environment, model, interval; for local simulation, fill in the starting balance.
- **Show running bots only:** If charts are blank, start at least one bot.
- **Prompt tweaks:** Save templates per environment/bot in Prompt Studio; changes take effect from the next polling cycle.

---

## FAQ
- **Bot not showing on the frontend?**  
  Ensure it’s running—only active bots appear. Leaderboard entries may take a moment if there are no trades yet.
- **Permission/signature errors on test-spot?**  
  Double-check you’re using Binance Spot Testnet keys; sandbox mode is enabled by default.
- **Still seeing a `default` entry?**  
  Backend filters the legacy `default` placeholder; hard refresh or clear cache if UI still shows it.

---

## Repo Structure (Quick Overview)
- `backend/`: Express server and AI trading loops (`/api/nof1`).
- `web/`: Frontend app—displays only running bots, keyed by `bot_id`.
- `markdown/`: Documentation notes.
- `scripts/`: Utility scripts for one-click start/stop.

---

## Security Notes
- Never commit real keys inside `config.json`; in production, prefer environment variables.
- Set `HTTPS_PROXY`/`HTTP_PROXY` if you need a proxy to reach exchanges.

---

## Support the Project

If the project helps you, please star/share it or buy the maintainer a coffee (yes, funds are tight lately 😅) to support ongoing work:

- **Donation address (TRC20):**
  - Address: `TVEWZuHaCZCao4xSPmVF1ceGCxkWMFXzsM`
  - Recommended token: USDT (widely supported stablecoin)
  - ⚠️ **Important:** Choose the **TRC20 network**. This address accepts any TRC20 token (USDT, USDC, TRX, etc.) but **cannot** receive tokens from other chains (ERC20, BSC, …).

<img src="assets/add.png" width="300" alt="Donation QR code" />

Thank you for your support! 😊

