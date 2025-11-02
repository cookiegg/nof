/**
 * 百炼平台 API 客户端（使用 OpenAI SDK）
 * 统一接口调用所有百炼模型
 */

import OpenAI from 'openai';
import { modelSupportsThinking } from './model-config.js';

const BAILIAN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

/**
 * 调用百炼平台 API
 * 
 * @param {string} apiKey - DASHSCOPE API Key
 * @param {string} model - 模型名称
 * @param {Array} messages - 消息列表，格式: [{role: 'system'|'user'|'assistant', content: string}]
 * @param {Object} options - 可选参数
 * @param {boolean} options.enable_thinking - 是否启用思考模式（仅对支持的模型有效）
 * @param {number} options.temperature - 温度参数，默认 0.7
 * @param {number} options.max_tokens - 最大输出token数，默认 2000
 * @param {boolean} options.stream - 是否流式输出，默认 false
 * @returns {Promise<Object>} 返回结果 {content, reasoning_content?, usage?}
 */
export async function callBailianAPI(apiKey, model, messages, options = {}) {
  if (!apiKey) {
    throw new Error('API Key 不能为空');
  }
  
  if (!model) {
    throw new Error('模型名称不能为空');
  }

  // 创建 OpenAI 客户端（使用百炼兼容模式）
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: BAILIAN_BASE_URL
  });

  const {
    enable_thinking = false,
    temperature = 0.7,
    max_tokens = 2000,
    stream = false
  } = options;

  // 检查模型是否支持思考模式
  const supportsThinking = modelSupportsThinking(model);
  const shouldEnableThinking = enable_thinking && supportsThinking;

  try {
    if (stream) {
      // 流式输出模式
      return await callBailianAPIStream(openai, model, messages, {
        enable_thinking: shouldEnableThinking,
        temperature,
        max_tokens
      });
    } else {
      // 非流式输出模式
      const response = await openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: temperature,
        max_tokens: max_tokens,
        ...(shouldEnableThinking ? { enable_thinking: true } : {})
      });

      const choice = response.choices?.[0];
      if (!choice) {
        throw new Error('API 返回空响应');
      }

      return {
        content: choice.message?.content || '',
        reasoning_content: choice.message?.reasoning_content || null,
        usage: response.usage || null
      };
    }
  } catch (error) {
    console.error('[BailianClient] API 调用失败:', error.message);
    throw new Error(`百炼 API 调用失败: ${error.message}`);
  }
}

/**
 * 流式调用百炼 API（用于提取思考内容）
 */
async function callBailianAPIStream(openai, model, messages, options) {
  const stream = await openai.chat.completions.create({
    model: model,
    messages: messages,
    stream: true,
    stream_options: {
      include_usage: true
    },
    ...options
  });

  let content = '';
  let reasoning_content = '';
  let usage = null;
  let isAnswering = false;

  for await (const chunk of stream) {
    // 检查是否是usage信息
    if (!chunk.choices?.length && chunk.usage) {
      usage = chunk.usage;
      continue;
    }

    const delta = chunk.choices?.[0]?.delta;
    if (!delta) continue;

    // 收集思考内容
    if (delta.reasoning_content !== undefined && delta.reasoning_content !== null) {
      if (!isAnswering) {
        reasoning_content += delta.reasoning_content;
      }
    }

    // 收集回复内容
    if (delta.content !== undefined && delta.content !== null) {
      if (!isAnswering) {
        isAnswering = true;
      }
      content += delta.content;
    }
  }

  return {
    content: content,
    reasoning_content: reasoning_content || null,
    usage: usage
  };
}
