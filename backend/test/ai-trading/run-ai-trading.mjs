// 运行AI交易系统
// 用法：node --env-file=./backend/.env backend/test/run-ai-trading.mjs [interval_minutes]

import { spawn } from 'child_process';
import { join, dirname } from 'path';
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

  // 运行一次AI交易
  async runTrading() {
    return new Promise((resolve, reject) => {
      const scriptPath = join(__dirname, 'ai-trading-system.mjs');
      
      console.log(`🚀 运行AI交易系统: ${scriptPath}`);
      
      const child = spawn('node', ['--env-file=../.env', scriptPath], {
        stdio: 'inherit',
        cwd: join(__dirname, '..')
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

  // 启动定时运行
  async start() {
    console.log(`🚀 启动AI交易定时运行 (间隔: ${this.intervalMinutes}分钟)`);
    console.log('按 Ctrl+C 停止');
    
    this.isRunning = true;
    
    // 立即运行一次
    try {
      await this.runTrading();
    } catch (error) {
      console.error('❌ 首次运行失败:', error.message);
    }
    
    // 设置定时器
    this.timer = setInterval(async () => {
      if (this.isRunning) {
        try {
          await this.runTrading();
        } catch (error) {
          console.error('❌ 定时运行失败:', error.message);
        }
      }
    }, this.intervalMs);
    
    // 处理退出信号
    process.on('SIGINT', () => {
      console.log('\n🛑 收到退出信号，正在停止...');
      this.stop();
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 收到终止信号，正在停止...');
      this.stop();
    });
  }

  // 停止运行
  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
    }
    console.log('🛑 AI交易定时运行已停止');
    process.exit(0);
  }
}

// 主函数
async function main() {
  const intervalMinutes = process.argv[2] ? parseInt(process.argv[2]) : 3;
  
  if (isNaN(intervalMinutes) || intervalMinutes < 1) {
    console.error('❌ 请提供有效的间隔时间（分钟）');
    console.log('用法: node backend/test/run-ai-trading.mjs [interval_minutes]');
    process.exit(1);
  }
  
  const runner = new AITradingRunner(intervalMinutes);
  await runner.start();
}

// 运行
main().catch(console.error);