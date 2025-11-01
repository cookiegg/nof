/**
 * Prompt管理器
 * 支持两种模式：
 * - env-shared: 从env模板目录读取（多个Bot共享）
 * - bot-specific: 从Bot特定目录读取（每个Bot独立）
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TPL_BASE_DIR = path.resolve(__dirname, '../../../ai/ai-trading/prompt_templates');

/**
 * 环境共享Prompt管理器
 */
class EnvPromptManager {
  constructor(env) {
    this.env = env;
    this.isFutures = env === 'demo-futures' || env === 'futures';
    this.sysPath = null;
    this.userPath = null;
    this._resolvePaths();
  }

  _resolvePaths() {
    if (this.isFutures) {
      this.sysPath = path.join(TPL_BASE_DIR, 'futures', 'system_prompt.txt');
      this.userPath = path.join(TPL_BASE_DIR, 'futures', 'user_prompt.hbs');
    } else {
      // spot
      this.sysPath = path.join(TPL_BASE_DIR, 'spot', 'system_prompt.txt');
      this.userPath = path.join(TPL_BASE_DIR, 'spot', 'user_prompt.hbs');
    }
  }

  async loadSystemPrompt() {
    try {
      return await fs.readFile(this.sysPath, 'utf8');
    } catch (e) {
      console.error(`[EnvPromptManager] 加载system prompt失败 (${this.env}):`, e);
      return '';
    }
  }

  async loadUserPrompt() {
    try {
      return await fs.readFile(this.userPath, 'utf8');
    } catch (e) {
      console.error(`[EnvPromptManager] 加载user prompt失败 (${this.env}):`, e);
      return '';
    }
  }

  async saveSystemPrompt(content) {
    await fs.mkdir(path.dirname(this.sysPath), { recursive: true });
    await fs.writeFile(this.sysPath, content, 'utf8');
  }

  async saveUserPrompt(content) {
    await fs.mkdir(path.dirname(this.userPath), { recursive: true });
    await fs.writeFile(this.userPath, content, 'utf8');
  }

  getPaths() {
    return {
      systemPrompt: this.sysPath,
      userPrompt: this.userPath
    };
  }
}

/**
 * Bot独立Prompt管理器
 */
class BotPromptManager {
  constructor(botId) {
    this.botId = botId;
    this.botPromptDir = path.resolve(__dirname, '../../../data/bots', botId, 'prompts');
    this.sysPath = path.join(this.botPromptDir, 'system_prompt.txt');
    this.userPath = path.join(this.botPromptDir, 'user_prompt.hbs');
  }

  async loadSystemPrompt() {
    try {
      return await fs.readFile(this.sysPath, 'utf8');
    } catch (e) {
      // 如果文件不存在，返回空字符串（可以后续从env模板继承）
      return '';
    }
  }

  async loadUserPrompt() {
    try {
      return await fs.readFile(this.userPath, 'utf8');
    } catch (e) {
      // 如果文件不存在，返回空字符串
      return '';
    }
  }

  async saveSystemPrompt(content) {
    await fs.mkdir(this.botPromptDir, { recursive: true });
    await fs.writeFile(this.sysPath, content, 'utf8');
  }

  async saveUserPrompt(content) {
    await fs.mkdir(this.botPromptDir, { recursive: true });
    await fs.writeFile(this.userPath, content, 'utf8');
  }

  /**
   * 从env模板继承prompt（用于初始化）
   */
  async inheritFromEnv(env) {
    const envManager = new EnvPromptManager(env);
    const [system, user] = await Promise.all([
      envManager.loadSystemPrompt(),
      envManager.loadUserPrompt()
    ]);
    
    if (system) await this.saveSystemPrompt(system);
    if (user) await this.saveUserPrompt(user);
    
    return { system, user };
  }

  getPaths() {
    return {
      systemPrompt: this.sysPath,
      userPrompt: this.userPath
    };
  }
}

/**
 * Prompt管理器工厂
 */
export class PromptManager {
  constructor(botConfig) {
    this.botConfig = botConfig;
    
    if (botConfig.promptMode === 'bot-specific') {
      this.manager = new BotPromptManager(botConfig.id);
    } else {
      this.manager = new EnvPromptManager(botConfig.env);
    }
  }

  async loadSystemPrompt() {
    const content = await this.manager.loadSystemPrompt();
    
    // 如果bot-specific模式且文件为空，尝试从env继承
    if (!content && this.botConfig.promptMode === 'bot-specific') {
      const envManager = new EnvPromptManager(this.botConfig.env);
      const envContent = await envManager.loadSystemPrompt();
      if (envContent) {
        await this.manager.saveSystemPrompt(envContent);
        return envContent;
      }
    }
    
    return content;
  }

  async loadUserPrompt() {
    const content = await this.manager.loadUserPrompt();
    
    // 如果bot-specific模式且文件为空，尝试从env继承
    if (!content && this.botConfig.promptMode === 'bot-specific') {
      const envManager = new EnvPromptManager(this.botConfig.env);
      const envContent = await envManager.loadUserPrompt();
      if (envContent) {
        await this.manager.saveUserPrompt(envContent);
        return envContent;
      }
    }
    
    return content;
  }

  async saveSystemPrompt(content) {
    await this.manager.saveSystemPrompt(content);
  }

  async saveUserPrompt(content) {
    await this.manager.saveUserPrompt(content);
  }

  getPaths() {
    return this.manager.getPaths();
  }
}

