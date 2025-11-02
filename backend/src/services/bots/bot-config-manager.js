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
  if (env === 'demo-futures' || env === 'demo-spot') {
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
      // 文件不存在，创建初始文件
      await fs.writeFile(this.botsFile, JSON.stringify({ bots: [] }, null, 2), 'utf8');
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
   */
  async getAllBots() {
    return await this._loadBots();
  }

  /**
   * 根据ID获取Bot配置
   */
  async getBotById(botId) {
    const bots = await this._loadBots();
    return bots.find(b => b.id === botId) || null;
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

