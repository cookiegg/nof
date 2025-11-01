import { spawn } from 'child_process';
import path from 'path';

/**
 * Bot实例管理
 */
class BotInstance {
  constructor(botId, config) {
    this.botId = botId;
    this.config = config;
    this.child = null;
    this.status = {
      running: false,
      pid: null,
      startedAt: null,
      intervalMinutes: config.intervalMinutes || 3,
      env: config.env,
      ai: config.aiPreset,
      lastExitCode: null,
    };
  }

  start() {
    if (this.child && this.status.running) return this.status;
    
    const projectRoot = process.cwd().endsWith('backend') 
      ? path.resolve(process.cwd(), '..') 
      : process.cwd();
    const runnerPath = path.resolve(projectRoot, 'backend/ai/ai-trading/run-ai-trading.mjs');
    const args = [runnerPath, String(this.config.intervalMinutes || 3)];

    const child = spawn('node', args, {
      stdio: 'inherit',
      cwd: projectRoot,
      env: {
        ...process.env,
        TRADING_ENV: this.config.env,
        AI_PRESET: this.config.aiPreset || '',
        BOT_ID: this.botId,
        TRADING_MODE: this.config.tradingMode || 'binance-demo',
        PROMPT_MODE: this.config.promptMode || 'env-shared',
      },
    });

    this.child = child;
    this.status.running = true;
    this.status.pid = child.pid;
    this.status.startedAt = new Date().toISOString();
    this.status.lastExitCode = null;

    child.on('close', (code) => {
      this.status.running = false;
      this.status.lastExitCode = code;
      this.child = null;
    });

    child.on('error', (err) => {
      console.error(`[BotInstance] Bot ${this.botId} 启动失败:`, err);
      this.status.running = false;
      this.child = null;
    });

    return this.status;
  }

  stop() {
    if (!this.child) {
      this.status.running = false;
      return this.status;
    }

    try {
      this.child.kill('SIGTERM');
    } catch (e) {
      console.error(`[BotInstance] 停止Bot ${this.botId} 失败:`, e);
    }

    this.child = null;
    this.status.running = false;
    return this.status;
  }

  getStatus() {
    return { ...this.status };
  }
}

/**
 * 多Bot管理器
 */
class TradingRunnerService {
  constructor() {
    this.bots = new Map(); // botId -> BotInstance
  }

  /**
   * 启动Bot
   */
  async startBot(botId, botConfig) {
    // 如果Bot已经在运行，先停止
    if (this.bots.has(botId)) {
      const existing = this.bots.get(botId);
      if (existing.status.running) {
        existing.stop();
      }
    }

    const instance = new BotInstance(botId, botConfig);
    this.bots.set(botId, instance);
    instance.start();
    return instance.getStatus();
  }

  /**
   * 停止Bot
   */
  stopBot(botId) {
    const instance = this.bots.get(botId);
    if (!instance) {
      throw new Error(`Bot '${botId}' 不存在`);
    }
    return instance.stop();
  }

  /**
   * 获取Bot状态
   */
  getBotStatus(botId) {
    const instance = this.bots.get(botId);
    if (!instance) {
      return null;
    }
    return instance.getStatus();
  }

  /**
   * 获取所有Bot状态
   */
  getAllBotStatuses() {
    const statuses = {};
    for (const [botId, instance] of this.bots.entries()) {
      statuses[botId] = instance.getStatus();
    }
    return statuses;
  }

  /**
   * 删除Bot实例（停止并移除）
   */
  removeBot(botId) {
    const instance = this.bots.get(botId);
    if (instance) {
      instance.stop();
      this.bots.delete(botId);
      return true;
    }
    return false;
  }

  /**
   * 获取所有运行的Bot ID
   */
  getRunningBotIds() {
    const running = [];
    for (const [botId, instance] of this.bots.entries()) {
      if (instance.status.running) {
        running.push(botId);
      }
    }
    return running;
  }

  // ==================== 向后兼容的API ====================
  
  /**
   * 启动单个Bot（向后兼容，使用默认配置）
   */
  start({ intervalMinutes = 3, env = undefined, ai = undefined } = {}) {
    // 为了向后兼容，如果没有指定botId，创建一个临时实例
    const tempBotId = 'default';
    
    const config = {
      id: tempBotId,
      env: env || 'demo-futures',
      aiPreset: ai || '',
      intervalMinutes,
      tradingMode: 'binance-demo',
      promptMode: 'env-shared'
    };

    return this.startBot(tempBotId, config);
  }

  /**
   * 停止默认Bot（向后兼容）
   */
  stop() {
    return this.stopBot('default');
  }

  /**
   * 获取默认Bot状态（向后兼容）
   */
  getStatus() {
    const status = this.getBotStatus('default');
    if (status) {
      return status;
    }
    // 返回空状态
    return {
      running: false,
      pid: null,
      startedAt: null,
      intervalMinutes: null,
      env: null,
      ai: null,
      lastExitCode: null,
    };
  }
}

export const tradingRunner = new TradingRunnerService();
