"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";

export interface ConversationMessage {
  role: string;
  content: string;
  timestamp?: number | string;
}

// 交易决策结构
export interface TradingDecision {
  action: 'buy' | 'sell' | 'close_position' | 'hold';
  symbol?: string;
  quantity?: number;
  leverage?: number;
  reasoning?: string;
  risk_assessment?: any;
}

// LLM响应结构
export interface LLMResponse {
  raw_text: string;
  parsed: {
    analysis?: {
      market_summary?: string;
      key_observations?: string[];
    };
    trading_decision?: TradingDecision;
    trading_decisions?: TradingDecision[];
    account_management?: {
      current_value?: number;
      available_cash?: number;
      total_return?: number;
      sharpe_ratio?: number;
      recommendations?: string[];
    };
  } | null;
  decision: TradingDecision | null;
  decision_normalized: TradingDecision | null;
  trading_decisions: TradingDecision[] | null;
}

// 思维链追踪
export interface CoTTrace {
  action: string;
  symbol: string;
  reasoning: string;
  analysis: any;
  account_management: any;
}

// 对话条目（增强版）
export interface ConversationItem {
  model_id: string;
  timestamp: number;
  inserted_at?: number;
  invocationCount?: number;
  
  // 摘要信息
  cot_trace_summary?: string;
  summary?: string;
  content?: string;
  
  // 原始数据
  user_prompt?: string;
  
  // 结构化数据
  llm_response?: LLMResponse;
  cot_trace?: CoTTrace;
  
  // 账户信息
  account?: {
    accountValue: number;
    totalReturn: number;
  };
  
  // 原始完整数据
  raw?: any;
  
  // 兼容旧格式
  messages?: ConversationMessage[];
}

export interface ConversationsResponse {
  conversations?: ConversationItem[];
  [k: string]: any;
}

export function useConversations() {
  const { data, error, isLoading } = useSWR<ConversationsResponse>(
    endpoints.conversations(),
    fetcher,
    {
      refreshInterval: 15000,
    },
  );
  const items: ConversationItem[] = normalize(data);
  return { items, raw: data, isLoading, isError: !!error };
}

function normalize(data?: ConversationsResponse): ConversationItem[] {
  if (!data) return [];
  if (Array.isArray(data.conversations)) return data.conversations as any;
  // lenient fallbacks
  if (Array.isArray((data as any).items)) return (data as any).items;
  if (Array.isArray((data as any).logs)) return (data as any).logs;
  return [];
}
