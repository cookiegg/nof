/**
 * API Key 管理器
 * 检测和管理 DASHSCOPE_API_KEY_* 环境变量的占用状态
 */

/**
 * 检测所有可用的 DASHSCOPE_API_KEY 环境变量
 * @returns {Array<{envName: string, key: string, available: boolean}>}
 */
function detectApiKeys() {
  const apiKeys = [];
  let index = 1;
  
  while (true) {
    const envName = `DASHSCOPE_API_KEY_${index}`;
    const key = process.env[envName];
    
    if (!key || key.trim() === '') {
      // 如果没有找到，检查下一个索引是否连续
      // 如果连续3个都没有，则认为检测完成
      let emptyCount = 0;
      for (let i = index; i < index + 3; i++) {
        const checkEnvName = `DASHSCOPE_API_KEY_${i}`;
        if (!process.env[checkEnvName] || process.env[checkEnvName].trim() === '') {
          emptyCount++;
        }
      }
      if (emptyCount >= 3) {
        break;
      }
    } else {
      apiKeys.push({
        envName: envName,
        key: key.trim(),
        available: true // 初始状态为可用
      });
    }
    
    index++;
  }
  
  return apiKeys;
}

/**
 * API Key 管理器类
 */
class ApiKeyManager {
  constructor() {
    // botId -> envName 的映射（记录哪个bot占用了哪个API Key）
    this.allocations = new Map();
    // 所有检测到的 API Keys
    this.apiKeys = [];
    this.refreshApiKeys();
  }

  /**
   * 刷新 API Keys 列表（重新检测环境变量）
   */
  refreshApiKeys() {
    this.apiKeys = detectApiKeys();
    // 更新可用状态（排除已被占用的）
    const allocatedEnvNames = new Set(this.allocations.values());
    this.apiKeys.forEach(apiKey => {
      apiKey.available = !allocatedEnvNames.has(apiKey.envName);
    });
  }

  /**
   * 获取所有 API Keys 及其状态
   * @returns {Array<{envName: string, available: boolean, allocatedTo?: string}>}
   */
  getAllApiKeys() {
    this.refreshApiKeys();
    return this.apiKeys.map(apiKey => {
      const result = {
        envName: apiKey.envName,
        available: apiKey.available
      };
      
      // 如果被占用，找出是被哪个bot占用
      if (!apiKey.available) {
        for (const [botId, envName] of this.allocations.entries()) {
          if (envName === apiKey.envName) {
            result.allocatedTo = botId;
            break;
          }
        }
      }
      
      return result;
    });
  }

  /**
   * 获取所有可用的 API Keys（未被占用的）
   * @returns {Array<{envName: string, key: string}>}
   */
  getAvailableApiKeys() {
    this.refreshApiKeys();
    return this.apiKeys
      .filter(apiKey => apiKey.available)
      .map(apiKey => ({
        envName: apiKey.envName,
        key: apiKey.key
      }));
  }

  /**
   * 检查指定的 API Key 是否可用
   * @param {string} envName - 环境变量名，如 'DASHSCOPE_API_KEY_1'
   * @returns {boolean}
   */
  isApiKeyAvailable(envName) {
    this.refreshApiKeys();
    const apiKey = this.apiKeys.find(ak => ak.envName === envName);
    if (!apiKey) {
      return false; // API Key 不存在
    }
    return apiKey.available;
  }

  /**
   * 分配 API Key 给 Bot（占用）
   * @param {string} botId - Bot ID
   * @param {string} envName - 环境变量名，如 'DASHSCOPE_API_KEY_1'
   * @throws {Error} 如果 API Key 不可用或已被占用
   */
  allocateApiKey(botId, envName) {
    if (!botId) {
      throw new Error('Bot ID 不能为空');
    }
    
    if (!envName) {
      throw new Error('API Key 环境变量名不能为空');
    }

    this.refreshApiKeys();
    
    // 检查 API Key 是否存在
    const apiKey = this.apiKeys.find(ak => ak.envName === envName);
    if (!apiKey) {
      throw new Error(`API Key '${envName}' 不存在`);
    }

    // 检查是否已被占用
    if (!apiKey.available) {
      // 找出是被哪个bot占用
      for (const [allocatedBotId, allocatedEnvName] of this.allocations.entries()) {
        if (allocatedEnvName === envName) {
          throw new Error(`API Key '${envName}' 已被 Bot '${allocatedBotId}' 占用`);
        }
      }
    }

    // 如果该bot已经占用了其他API Key，先释放
    if (this.allocations.has(botId)) {
      const oldEnvName = this.allocations.get(botId);
      if (oldEnvName !== envName) {
        // 释放旧的
        this.allocations.delete(botId);
      } else {
        // 已经是这个API Key，无需重复分配
        return;
      }
    }

    // 分配新的 API Key
    this.allocations.set(botId, envName);
    apiKey.available = false;
  }

  /**
   * 释放 Bot 占用的 API Key
   * @param {string} botId - Bot ID
   */
  releaseApiKey(botId) {
    if (!botId) {
      return;
    }

    const envName = this.allocations.get(botId);
    if (envName) {
      this.allocations.delete(botId);
      // 更新 API Key 的可用状态
      const apiKey = this.apiKeys.find(ak => ak.envName === envName);
      if (apiKey) {
        apiKey.available = true;
      }
    }
  }

  /**
   * 获取 Bot 占用的 API Key
   * @param {string} botId - Bot ID
   * @returns {string|null} 环境变量名，如果未占用则返回 null
   */
  getBotApiKey(botId) {
    return this.allocations.get(botId) || null;
  }

  /**
   * 获取所有 API Key 的占用情况
   * @returns {Object} {envName: botId} 的映射
   */
  getApiKeyUsage() {
    const usage = {};
    for (const [botId, envName] of this.allocations.entries()) {
      usage[envName] = botId;
    }
    return usage;
  }

  /**
   * 获取 API Key 的实际值（用于调用API）
   * @param {string} envName - 环境变量名
   * @returns {string|null} API Key 值
   */
  getApiKeyValue(envName) {
    if (!envName) {
      return null;
    }
    return process.env[envName]?.trim() || null;
  }
}

// 导出单例
export const apiKeyManager = new ApiKeyManager();
