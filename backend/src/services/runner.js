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
      model: config.model || '',
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
        MODEL: this.config.model || '',
        BOT_ID: this.botId,
        TRADING_MODE: this.config.tradingMode || 'binance-demo',
        PROMPT_MODE: this.config.promptMode || 'env-shared',
        DASHSCOPE_API_KEY_ENV: this.config.dashscopeApiKey || '',
        ENABLE_THINKING: this.config.enableThinking ? 'true' : 'false',
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

    // 启动前初始化该Bot的数据目录与种子文件（无论真实/模拟）
    try {
      const { BotStateManager } = await import('./trading/bot-state-manager.js');
      const stateManager = new BotStateManager(botId);
      const existingState = await stateManager.loadState();
      if (!existingState) {
        const seed = {
          startTime: new Date().toISOString(),
          invocationCount: 0,
          totalReturn: 0,
          accountValue: 0,
          availableCash: 0,
          positions: [],
          lastUpdate: new Date().toISOString(),
          tradingEnabled: true
        };
        await stateManager.saveState(seed);
        await stateManager.saveConversations([]);
        await stateManager.saveTrades([]);
      }
    } catch (e) {
      console.warn(`[Runner] 预初始化Bot数据目录失败 (${botId}):`, e.message);
    }

    const instance = new BotInstance(botId, botConfig);
    this.bots.set(botId, instance);
    instance.start();

    // 异步预热：在子进程首次循环前，尽量写入一份实时账户快照到该 bot 的专属状态，便于前端立即显示
    (async () => {
      try {
        const [{ BotStateManager }, binance] = await Promise.all([
          import('./trading/bot-state-manager.js'),
          import('./binance.js').catch(() => null),
        ]);
        const sm = new BotStateManager(botId);
        const cur = (await sm.loadState()) || {};
        let accountValue = Number(cur.accountValue || 0);
        let availableCash = Number(cur.availableCash || 0);
        let positions = Array.isArray(cur.positions) ? cur.positions : [];

        if (binance && (typeof binance.getRealTimeAccountData === 'function' || typeof binance.getAccountBalance === 'function')) {
          try {
            // 临时切换进程的 TRADING_ENV，保证数据读取针对该 bot 的环境
            const prevEnv = process.env.TRADING_ENV;
            process.env.TRADING_ENV = botConfig.env;
            const rt = typeof binance.getRealTimeAccountData === 'function'
              ? await binance.getRealTimeAccountData()
              : null;
            if (!rt && typeof binance.getAccountBalance === 'function') {
              const bal = await binance.getAccountBalance();
              if (Number.isFinite(Number(bal))) accountValue = Number(bal);
            }
            process.env.TRADING_ENV = prevEnv;
            if (rt) {
              accountValue = Number(rt.balance || accountValue || 0);
              availableCash = Number(rt.availableCash || availableCash || 0);
              positions = Array.isArray(rt.positions) ? rt.positions : positions;
            }
          } catch (_) {}
        }

        const next = {
          ...cur,
          accountValue,
          availableCash,
          positions,
          lastUpdate: new Date().toISOString(),
        };
        await sm.saveState(next);
      } catch (_) {}
    })();
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
      model: 'qwen3-plus', // 默认模型
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
