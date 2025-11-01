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
 * 解析Bot的AI配置（从preset读取）
 */
export function resolveAIConfig(botConfig, globalConfig = null) {
  const config = globalConfig || loadConfig();
  const presetName = botConfig.aiPreset;
  
  if (!presetName) {
    throw new Error('Bot配置缺少aiPreset字段');
  }
  
  const preset = config.ai?.presets?.[presetName];
  if (!preset) {
    throw new Error(`AI preset '${presetName}' 在config.json中不存在`);
  }
  
  // 从preset读取，支持环境变量展开
  const apiKey = expandEnvMaybe(preset.api_key || config.ai?.api_key || '');
  
  return {
    provider: preset.provider || config.ai?.provider || 'deepseek',
    model: preset.model || config.ai?.model || 'deepseek-chat',
    api_key: apiKey,
    temperature: preset.temperature ?? config.ai?.temperature ?? 0.7,
    max_tokens: preset.max_tokens ?? config.ai?.max_tokens ?? 2000
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
    if (!botConfig.aiPreset) {
      throw new Error('Bot aiPreset是必需的');
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

    // 验证AI preset是否存在
    const config = loadConfig();
    if (!config.ai?.presets?.[botConfig.aiPreset]) {
      throw new Error(`AI preset '${botConfig.aiPreset}' 在config.json中不存在`);
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

    // 如果aiPreset改变，验证新preset是否存在
    if (updates.aiPreset) {
      const config = loadConfig();
      if (!config.ai?.presets?.[updates.aiPreset]) {
        throw new Error(`AI preset '${updates.aiPreset}' 在config.json中不存在`);
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

