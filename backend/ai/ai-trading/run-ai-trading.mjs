// 运行AI交易系统（统一到 backend/ai/ai-trading）
// 用法：node backend/ai/ai-trading/run-ai-trading.mjs [interval_minutes]
// 说明：若存在 backend/.env 会自动加载；否则使用进程环境变量（含根级 config.json 注入）。

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class AITradingRunner {
  constructor(intervalMinutes = 3) {
    this.intervalMinutes = intervalMinutes;
    this.intervalMs = intervalMinutes * 60 * 1000;
    this.isRunning = false;
    this.timer = null;
  }

  async runTrading() {
    return new Promise((resolve, reject) => {
      const scriptPath = join(__dirname, 'ai-trading-system.v2.mjs');
      console.log(`🚀 运行AI交易系统: ${scriptPath}`);
      const envArg = process.env.TRADING_ENV ? ['--env', process.env.TRADING_ENV] : [];
      const aiArg = process.env.AI_PRESET ? ['--ai', process.env.AI_PRESET] : [];
      const rootCwd = join(__dirname, '..', '..', '..');
      const envFileArg = (() => {
        const p = join(rootCwd, 'backend', '.env');
        return fs.existsSync(p) ? [`--env-file=${p}`] : [];
      })();
      const child = spawn('node', [...envFileArg, scriptPath, ...envArg, ...aiArg], {
        stdio: 'inherit',
        // 关键：将工作目录切到项目根，使 ai-trading-system 按相对路径读取 backend/ai/ai-trading/config.json
        cwd: rootCwd,
        env: { ...process.env }
      });
      child.on('close', (code) => {
        if (code === 0) {
          console.log('✅ AI交易系统运行完成');
          resolve();
        } else {
          console.error(`❌ AI交易系统运行失败，退出码: ${code}`);
          reject(new Error(`AI交易系统运行失败，退出码: ${code}`));
        }
      });
      child.on('error', (error) => {
        console.error('❌ 启动AI交易系统失败:', error.message);
        reject(error);
      });
    });
  }

  async start() {
    console.log(`🚀 启动AI交易定时运行 (间隔: ${this.intervalMinutes}分钟)`);
    console.log('按 Ctrl+C 停止');
    this.isRunning = true;
    try { await this.runTrading(); } catch (error) { console.error('❌ 首次运行失败:', error.message); }
    this.timer = setInterval(async () => {
      if (this.isRunning) {
        try { await this.runTrading(); } catch (error) { console.error('❌ 定时运行失败:', error.message); }
      }
    }, this.intervalMs);
    process.on('SIGINT', () => { console.log('\n🛑 收到退出信号，正在停止...'); this.stop(); });
    process.on('SIGTERM', () => { console.log('\n🛑 收到终止信号，正在停止...'); this.stop(); });
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    console.log('🛑 AI交易定时运行已停止');
    process.exit(0);
  }
}

async function main() {
  const intervalMinutes = process.argv[2] ? parseInt(process.argv[2]) : 3;
  if (isNaN(intervalMinutes) || intervalMinutes < 1) {
    console.error('❌ 请提供有效的间隔时间（分钟）');
    console.log('用法: node backend/ai/ai-trading/run-ai-trading.mjs [interval_minutes]');
    process.exit(1);
  }
  const runner = new AITradingRunner(intervalMinutes);
  await runner.start();
}

main().catch(console.error);


