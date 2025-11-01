/**
 * Bot状态管理器
 * 管理每个Bot的独立状态文件
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class BotStateManager {
  constructor(botId) {
    this.botId = botId;
    this.botDataDir = path.resolve(__dirname, '../../../data/bots', botId);
    this.stateFile = path.join(this.botDataDir, 'trading-state.json');
    this.conversationsFile = path.join(this.botDataDir, 'conversations.json');
    this.tradesFile = path.join(this.botDataDir, 'trades.json');
  }

  /**
   * 确保目录存在
   */
  async _ensureDir() {
    await fs.mkdir(this.botDataDir, { recursive: true });
  }

  /**
   * 加载状态
   */
  async loadState() {
    try {
      await this._ensureDir();
      const raw = await fs.readFile(this.stateFile, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      // 文件不存在时返回null
      return null;
    }
  }

  /**
   * 保存状态
   */
  async saveState(state) {
    await this._ensureDir();
    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2), 'utf8');
  }

  /**
   * 加载对话记录
   */
  async loadConversations() {
    try {
      await this._ensureDir();
      const raw = await fs.readFile(this.conversationsFile, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data.conversations) ? data.conversations : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 保存对话记录
   */
  async saveConversations(conversations) {
    await this._ensureDir();
    await fs.writeFile(
      this.conversationsFile,
      JSON.stringify({ conversations }, null, 2),
      'utf8'
    );
  }

  /**
   * 添加对话记录
   */
  async addConversation(conversation) {
    const conversations = await this.loadConversations();
    conversations.push(conversation);
    await this.saveConversations(conversations);
    return conversation;
  }

  /**
   * 加载交易记录
   */
  async loadTrades() {
    try {
      await this._ensureDir();
      const raw = await fs.readFile(this.tradesFile, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data.trades) ? data.trades : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 保存交易记录
   */
  async saveTrades(trades) {
    await this._ensureDir();
    await fs.writeFile(
      this.tradesFile,
      JSON.stringify({ trades }, null, 2),
      'utf8'
    );
  }

  /**
   * 添加交易记录
   */
  async addTrade(trade) {
    const trades = await this.loadTrades();
    trades.push(trade);
    await this.saveTrades(trades);
    return trade;
  }

  /**
   * 获取文件路径
   */
  getStateFilePath() {
    return this.stateFile;
  }

  getConversationsFilePath() {
    return this.conversationsFile;
  }

  getTradesFilePath() {
    return this.tradesFile;
  }
}

