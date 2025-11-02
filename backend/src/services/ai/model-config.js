/**
 * 百炼平台模型配置和限制定义
 */

// 支持的模型列表
export const SUPPORTED_MODELS = {
  'qwen3-max': {
    name: 'qwen3-max',
    displayName: 'Qwen3 Max',
    supportsThinking: false,
    provider: 'dashscope'
  },
  'qwen3-plus': {
    name: 'qwen3-plus',
    displayName: 'Qwen3 Plus',
    supportsThinking: false,
    provider: 'dashscope'
  },
  'glm-4.6': {
    name: 'glm-4.6',
    displayName: 'GLM-4.6',
    supportsThinking: true,
    provider: 'dashscope'
  },
  'deepseek-v3.2-exp': {
    name: 'deepseek-v3.2-exp',
    displayName: 'DeepSeek V3.2 Exp',
    supportsThinking: true,
    provider: 'dashscope'
  },
  'deepseek-v3.1': {
    name: 'deepseek-v3.1',
    displayName: 'DeepSeek V3.1',
    supportsThinking: true,
    provider: 'dashscope'
  }
};

/**
 * 获取所有支持的模型名称列表
 */
export function getSupportedModelNames() {
  return Object.keys(SUPPORTED_MODELS);
}

/**
 * 验证模型名称是否有效
 */
export function isValidModel(modelName) {
  return modelName in SUPPORTED_MODELS;
}

/**
 * 获取模型配置信息
 */
export function getModelConfig(modelName) {
  return SUPPORTED_MODELS[modelName] || null;
}

/**
 * 检查模型是否支持思考模式
 */
export function modelSupportsThinking(modelName) {
  const config = getModelConfig(modelName);
  return config ? config.supportsThinking : false;
}

/**
 * 获取所有模型的显示名称映射（用于前端显示）
 */
export function getModelDisplayNames() {
  const result = {};
  for (const [key, config] of Object.entries(SUPPORTED_MODELS)) {
    result[key] = config.displayName;
  }
  return result;
}
