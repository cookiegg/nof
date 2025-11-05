/**
 * Bot配置管理器
 * 负责Bot配置的CRUD操作和AI配置解析
 */

import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BOTS_FILE = path.resolve(__dirname, '../../../data/bots.json');
const CONFIG_FILE = path.resolve(__dirname, '../../../ai/ai-trading/config.json');

/**
 * 展开环境变量（如果值格式为 ${VAR_NAME}）
 */
function expandEnvMaybe(value) {
  if (typeof value !== 'string') return value;
  const match = value.match(/^\$\{([^}]+)\}$/);
  if (match) {
    return process.env[match[1]] || value;
  }
  return value;
}

/**
 * 从config.json加载配置
 */
function loadConfig() {
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf8');
    const cfg = JSON.parse(raw);
    // 展开AI配置中的环境变量
    if (cfg.ai?.api_key) {
      cfg.ai.api_key = expandEnvMaybe(cfg.ai.api_key);
    }
    if (cfg.ai?.presets) {
      for (const key in cfg.ai.presets) {
        const preset = cfg.ai.presets[key];
        if (preset.api_key) {
          preset.api_key = expandEnvMaybe(preset.api_key);
        }
      }
    }
    return cfg;
  } catch (e) {
    console.error('[BotConfigManager] 加载config.json失败:', e);
    return { ai: { presets: {} } };
  }
}

/**
 * 解析Bot的AI配置（直接从botConfig读取，统一使用百炼API）
 */
export async function resolveAIConfig(botConfig, globalConfig = null) {
  const config = globalConfig || loadConfig();
  
  // 验证必填字段
  if (!botConfig.model) {
    throw new Error('Bot配置缺少model字段');
  }
  
  // 验证模型是否支持（同步方式，避免阻塞）
  try {
    // 使用动态导入，但同步验证（如果导入失败只记录警告）
    import('../ai/model-config.js').then(({ isValidModel }) => {
      if (!isValidModel(botConfig.model)) {
        console.warn(`[BotConfigManager] 不支持的模型: ${botConfig.model}`);
      }
    }).catch(() => {
      // 忽略导入错误，不阻止继续
    });
  } catch (e) {
    // 忽略验证错误
  }
  
  // 优先使用 bot 配置中的 dashscopeApiKey
  let apiKey = '';
  if (botConfig.dashscopeApiKey) {
    // 直接从环境变量获取（dashscopeApiKey 是环境变量名，如 'DASHSCOPE_API_KEY_1'）
    apiKey = expandEnvMaybe(`\${${botConfig.dashscopeApiKey}}`);
  }
  
  // 如果 bot 没有指定 dashscopeApiKey，尝试从配置中获取默认值
  if (!apiKey) {
    // 尝试使用第一个可用的 DASHSCOPE_API_KEY
    let index = 1;
    while (index <= 10) { // 最多检查10个
      const envName = `DASHSCOPE_API_KEY_${index}`;
      const keyValue = process.env[envName];
      if (keyValue && keyValue.trim()) {
        apiKey = keyValue.trim();
        break;
      }
      index++;
    }
    
    // 如果还是没有，使用配置中的默认值（可能为空，会在调用时报错）
    if (!apiKey) {
      apiKey = expandEnvMaybe(config.ai?.api_key || '');
    }
  }
  
  return {
    provider: 'dashscope',
    model: botConfig.model,
    api_key: apiKey,
    temperature: config.ai?.temperature ?? 0.7,
    max_tokens: config.ai?.max_tokens ?? 2000,
    enable_thinking: botConfig.enableThinking ?? false
  };
}

/**
 * 推断tradingMode
 */
export function inferTradingMode(env) {
  if (env === 'demo-futures' || env === 'test-spot' || env === 'demo-spot') {
    return 'binance-demo';
  }
  if (env === 'futures' || env === 'spot') {
    return 'binance-demo';
  }
  // 其他自定义名称视为本地模拟
  return 'local-simulated';
}

/**
 * Bot配置管理器
 */
class BotConfigManager {
  constructor() {
    this.botsFile = BOTS_FILE;
    this.configFile = CONFIG_FILE;
    this._ensureBotsFile();
  }

  async _ensureBotsFile() {
    try {
      await fs.mkdir(path.dirname(this.botsFile), { recursive: true });
      await fs.access(this.botsFile);
    } catch {
      // 文件不存在，创建初始文件，预置两个默认的 1 类 demo 交易 bot（demo-futures 与 demo-spot）
      const nowId = Date.now();
      const defaults = [
        {
          id: 'demo-futures-default',
          name: 'demo-futures-default',
          env: 'demo-futures',
          model: 'qwen3-plus',
          intervalMinutes: 3,
          promptMode: 'bot-specific',
          tradingMode: 'binance-demo',
          botClass: 'demo-real',
          createdAt: nowId
        },
        {
          id: 'test-spot-default',
          name: 'test-spot-default',
          env: 'test-spot',
          model: 'qwen3-plus',
          intervalMinutes: 3,
          promptMode: 'bot-specific',
          tradingMode: 'binance-demo',
          botClass: 'demo-real',
          createdAt: nowId
        }
      ];
      await fs.writeFile(this.botsFile, JSON.stringify({ bots: defaults }, null, 2), 'utf8');
    }
  }

  async _loadBots() {
    try {
      const raw = await fs.readFile(this.botsFile, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data.bots) ? data.bots : [];
    } catch (e) {
      console.error('[BotConfigManager] 读取bots.json失败:', e);
      return [];
    }
  }

  async _saveBots(bots) {
    await fs.writeFile(this.botsFile, JSON.stringify({ bots }, null, 2), 'utf8');
  }

  /**
   * 获取所有Bot配置
   * 自动迁移旧格式（aiPreset -> model）
   */
  async getAllBots() {
    const bots = await this._loadBots();
    let needsSave = false;
    
    // 迁移旧格式的bot：aiPreset -> model
    for (const bot of bots) {
      if (bot.aiPreset && !bot.model) {
        // 将旧的aiPreset映射到对应的model
        const presetToModel = {
          'deepseek': 'deepseek-v3.2-exp', // 默认使用v3.2-exp
          'qwen': 'qwen3-plus',
          'glm': 'glm-4.6'
        };
        const oldPreset = bot.aiPreset;
        bot.model = presetToModel[oldPreset] || 'qwen3-plus';
        delete bot.aiPreset; // 移除旧字段
        needsSave = true;
        console.log(`[BotConfigManager] 自动迁移Bot ${bot.id}: aiPreset "${oldPreset}" -> model "${bot.model}"`);
      }
      // 设置 botClass（1/2/3 类标识）：
      // demo-real: env 为 demo-futures/demo-spot 且 非 local-simulated
      // demo-sim:  env 为 demo-futures/demo-spot 且 为 local-simulated
      // live-real: env 为 futures/spot 且 非 local-simulated
      if (!bot.botClass) {
        const isDemo = bot.env === 'demo-futures' || bot.env === 'test-spot' || bot.env === 'demo-spot';
        const isLive = bot.env === 'futures' || bot.env === 'spot';
        if (isDemo) {
          bot.botClass = bot.tradingMode === 'local-simulated' ? 'demo-sim' : 'demo-real';
        } else if (isLive) {
          bot.botClass = bot.tradingMode === 'local-simulated' ? 'demo-sim' : 'live-real';
        }
        if (bot.botClass) needsSave = true;
      }
    }
    
    if (needsSave) {
      await this._saveBots(bots);
    }
    
    return bots;
  }

  /**
   * 根据ID获取Bot配置
   * 自动迁移旧格式（aiPreset -> model）
   */
  async getBotById(botId) {
    const bots = await this._loadBots();
    const bot = bots.find(b => b.id === botId);
    
    // 如果找到了bot且有aiPreset但没有model，进行迁移
    if (bot && bot.aiPreset && !bot.model) {
      const presetToModel = {
        'deepseek': 'deepseek-v3.2-exp',
        'qwen': 'qwen3-plus',
        'glm': 'glm-4.6'
      };
      const oldPreset = bot.aiPreset;
      bot.model = presetToModel[oldPreset] || 'qwen3-plus';
      delete bot.aiPreset;
      // 保存迁移后的配置
      await this._saveBots(bots);
      console.log(`[BotConfigManager] 自动迁移Bot ${botId}: aiPreset "${oldPreset}" -> model "${bot.model}"`);
    }
    
    return bot || null;
  }

  /**
   * 创建新Bot
   */
  async createBot(botConfig) {
    const bots = await this._loadBots();
    
    // 验证必填字段
    if (!botConfig.id) {
      throw new Error('Bot ID是必需的');
    }
    if (!botConfig.env) {
      throw new Error('Bot env是必需的');
    }
    if (!botConfig.model) {
      throw new Error('Bot model是必需的');
    }
    if (!botConfig.intervalMinutes) {
      throw new Error('Bot intervalMinutes是必需的');
    }

    // 检查ID是否已存在
    if (bots.some(b => b.id === botConfig.id)) {
      throw new Error(`Bot ID '${botConfig.id}' 已存在`);
    }

    // 自动推断tradingMode
    if (!botConfig.tradingMode) {
      botConfig.tradingMode = inferTradingMode(botConfig.env);
    }

    // 业务规则（来自 bot_design.md）：
    // - 同一交易类型（env=demo-futures 或 demo-spot）仅允许存在一个“真实 demo 交易 bot”（非 local-simulated）。
    // - 当已存在同类型真实 demo bot 时，后续创建的同类型 bot 自动降级为本地模拟(local-simulated)。
    const isDemoEnv = botConfig.env === 'demo-futures' || botConfig.env === 'test-spot' || botConfig.env === 'demo-spot';
    const isLiveEnv = botConfig.env === 'futures' || botConfig.env === 'spot';
    if (isDemoEnv || isLiveEnv) {
      const hasReal = bots.some(b => (b.env === botConfig.env) && (b.tradingMode !== 'local-simulated'));
      if (hasReal) {
        botConfig.tradingMode = 'local-simulated';
        // 标记来源，便于前端提示（非强依赖字段）
        botConfig._autoDowngraded = true;
      }
    }

    // 补充 botClass 标识（1 类=demo-real，2 类=demo-sim，3 类=live-real）
    if (!botConfig.botClass) {
      if (isDemoEnv) {
        botConfig.botClass = botConfig.tradingMode === 'local-simulated' ? 'demo-sim' : 'demo-real';
      } else if (isLiveEnv) {
        botConfig.botClass = botConfig.tradingMode === 'local-simulated' ? 'demo-sim' : 'live-real';
      }
    }

    // 默认promptMode
    if (!botConfig.promptMode) {
      botConfig.promptMode = 'env-shared';
    }

    // 验证模型是否支持
    try {
      const { isValidModel } = await import('../ai/model-config.js');
      if (!isValidModel(botConfig.model)) {
        throw new Error(`不支持的模型: ${botConfig.model}`);
      }
    } catch (e) {
      // 如果导入失败，只记录警告，不阻止创建
      console.warn('[BotConfigManager] 无法验证模型:', e.message);
    }

    bots.push(botConfig);
    await this._saveBots(bots);
    return botConfig;
  }

  /**
   * 更新Bot配置
   */
  async updateBot(botId, updates) {
    const bots = await this._loadBots();
    const index = bots.findIndex(b => b.id === botId);
    
    if (index === -1) {
      throw new Error(`Bot ID '${botId}' 不存在`);
    }

    // 合并更新
    const updated = { ...bots[index], ...updates };
    
    // 如果env改变，重新推断tradingMode
    if (updates.env && !updates.tradingMode) {
      updated.tradingMode = inferTradingMode(updates.env);
    }

    // 如果model改变，验证新模型是否支持
    if (updates.model) {
      try {
        const { isValidModel } = await import('../ai/model-config.js');
        if (!isValidModel(updates.model)) {
          throw new Error(`不支持的模型: ${updates.model}`);
        }
      } catch (e) {
        console.warn('[BotConfigManager] 无法验证模型:', e.message);
      }
    }

    bots[index] = updated;
    await this._saveBots(bots);
    return updated;
  }

  /**
   * 删除Bot
   */
  async deleteBot(botId) {
    const bots = await this._loadBots();
    const filtered = bots.filter(b => b.id !== botId);
    
    if (filtered.length === bots.length) {
      throw new Error(`Bot ID '${botId}' 不存在`);
    }

    await this._saveBots(filtered);
    return true;
  }

  /**
   * 获取Bot的完整配置（包含解析后的AI配置）
   */
  async getBotConfigWithAI(botId) {
    const bot = await this.getBotById(botId);
    if (!bot) return null;

    const config = loadConfig();
    const aiConfig = resolveAIConfig(bot, config);
    
    return {
      ...bot,
      aiConfig
    };
  }
}

export const botConfigManager = new BotConfigManager();

