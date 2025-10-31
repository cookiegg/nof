import { spawn } from 'child_process';
import path from 'path';

class TradingRunnerService {
  constructor() {
    this.child = null;
    this.status = {
      running: false,
      pid: null,
      startedAt: null,
      intervalMinutes: null,
      env: null,
      ai: null,
      lastExitCode: null,
    };
  }

  start({ intervalMinutes = 3, env = undefined, ai = undefined } = {}) {
    if (this.child && this.status.running) return this.status;
    const runnerPath = path.resolve(process.cwd(), 'backend/ai/ai-trading/run-ai-trading.mjs');
    const args = [runnerPath, String(intervalMinutes)];
    // ??????server.js???? dotenv ?? backend/.env???????????
    const child = spawn('node', args, {
      stdio: 'inherit',
      cwd: path.resolve(process.cwd()),
      env: {
        ...process.env,
        ...(env ? { TRADING_ENV: env } : {}),
        ...(ai ? { AI_PRESET: ai } : {}),
      },
    });
    this.child = child;
    this.status.running = true;
    this.status.pid = child.pid;
    this.status.startedAt = new Date().toISOString();
    this.status.intervalMinutes = intervalMinutes;
    this.status.env = env || null;
    this.status.ai = ai || null;
    this.status.lastExitCode = null;
    child.on('close', (code) => {
      this.status.running = false;
      this.status.lastExitCode = code;
      this.child = null;
    });
    child.on('error', () => {
      this.status.running = false;
      this.child = null;
    });
    return this.status;
  }

  stop() {
    if (!this.child) return this.status;
    try {
      this.child.kill('SIGTERM');
    } catch (_) {}
    this.child = null;
    this.status.running = false;
    return this.status;
  }

  getStatus() {
    return this.status;
  }
}

export const tradingRunner = new TradingRunnerService();


