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
 * 支持四种环境：demo-futures, demo-spot, futures, spot
 * 每种环境有独立的模板目录
 */
class EnvPromptManager {
  constructor(env) {
    this.env = env;
    this.sysPath = null;
    this.userPath = null;
    this._resolvePaths();
  }

  _resolvePaths() {
    // 支持四种环境：demo-futures, demo-spot, futures, spot
    // 每种环境有独立的目录
    const envDir = this.env; // 直接使用环境名称作为目录名
    
    // 允许的环境列表（用于验证）
    const validEnvs = ['demo-futures', 'test-spot', 'demo-spot', 'futures', 'spot'];
    
    // 如果环境名称无效，使用向后兼容逻辑
    if (!validEnvs.includes(envDir)) {
      console.warn(`[EnvPromptManager] 未知环境 "${envDir}"，使用向后兼容逻辑`);
      // 向后兼容：使用旧的futures/spot目录
      if (envDir === 'demo-futures' || envDir === 'futures') {
        this.sysPath = path.join(TPL_BASE_DIR, 'futures', 'system_prompt.txt');
        this.userPath = path.join(TPL_BASE_DIR, 'futures', 'user_prompt.hbs');
      } else {
        this.sysPath = path.join(TPL_BASE_DIR, 'spot', 'system_prompt.txt');
        this.userPath = path.join(TPL_BASE_DIR, 'spot', 'user_prompt.hbs');
      }
      return;
    }
    
    // 新逻辑：直接使用环境名称作为目录
    this.sysPath = path.join(TPL_BASE_DIR, envDir, 'system_prompt.txt');
    this.userPath = path.join(TPL_BASE_DIR, envDir, 'user_prompt.hbs');
  }

  async loadSystemPrompt() {
    try {
      return await fs.readFile(this.sysPath, 'utf8');
    } catch (e) {
      // 向后兼容：如果新目录不存在，尝试使用旧的futures/spot目录
      const fallbackPath = this._getFallbackPath('system_prompt.txt');
      if (fallbackPath && fallbackPath !== this.sysPath) {
        try {
          return await fs.readFile(fallbackPath, 'utf8');
        } catch (e2) {
          console.error(`[EnvPromptManager] 加载system prompt失败 (${this.env}):`, e2);
          return '';
        }
      }
      console.error(`[EnvPromptManager] 加载system prompt失败 (${this.env}):`, e);
      return '';
    }
  }

  async loadUserPrompt() {
    try {
      return await fs.readFile(this.userPath, 'utf8');
    } catch (e) {
      // 向后兼容：如果新目录不存在，尝试使用旧的futures/spot目录
      const fallbackPath = this._getFallbackPath('user_prompt.hbs');
      if (fallbackPath && fallbackPath !== this.userPath) {
        try {
          return await fs.readFile(fallbackPath, 'utf8');
        } catch (e2) {
          console.error(`[EnvPromptManager] 加载user prompt失败 (${this.env}):`, e2);
          return '';
        }
      }
      console.error(`[EnvPromptManager] 加载user prompt失败 (${this.env}):`, e);
      return '';
    }
  }

  /**
   * 获取向后兼容的回退路径（用于旧目录结构）
   */
  _getFallbackPath(filename) {
    const env = this.env;
    if (env === 'demo-futures' || env === 'futures') {
      return path.join(TPL_BASE_DIR, 'futures', filename);
    } else if (env === 'test-spot' || env === 'demo-spot' || env === 'spot') {
      return path.join(TPL_BASE_DIR, 'spot', filename);
    }
    return null;
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

  /**
   * 从其他Bot复制prompt（用于创建新Bot时复用已有Bot的prompt）
   */
  async copyFromBot(sourceBotId) {
    const sourceManager = new BotPromptManager(sourceBotId);
    const [system, user] = await Promise.all([
      sourceManager.loadSystemPrompt(),
      sourceManager.loadUserPrompt()
    ]);
    
    // 如果源Bot的prompt为空，尝试从它的env模板加载
    let systemContent = system;
    let userContent = user;
    
    if (!systemContent || !userContent) {
      // 需要获取源Bot的env配置
      try {
        const { botConfigManager } = await import('../bots/bot-config-manager.js');
        const sourceBot = await botConfigManager.getBotById(sourceBotId);
        if (sourceBot && sourceBot.env) {
          const envManager = new EnvPromptManager(sourceBot.env);
          if (!systemContent) {
            systemContent = await envManager.loadSystemPrompt();
          }
          if (!userContent) {
            userContent = await envManager.loadUserPrompt();
          }
        }
      } catch (e) {
        console.warn(`[BotPromptManager] 获取源Bot配置失败:`, e.message);
      }
    }
    
    if (systemContent) await this.saveSystemPrompt(systemContent);
    if (userContent) await this.saveUserPrompt(userContent);
    
    return { system: systemContent, user: userContent };
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

