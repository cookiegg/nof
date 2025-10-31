"use client";
import { useConversations, ConversationItem, TradingDecision } from "@/lib/api/hooks/useConversations";
import { useState } from "react";

// 决策徽章组件
function DecisionBadge({ action }: { action: string }) {
  const badges: Record<string, { emoji: string; text: string; color: string }> = {
    buy: { emoji: '📈', text: '买入', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    sell: { emoji: '📉', text: '卖出', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    close_position: { emoji: '🔚', text: '平仓', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    hold: { emoji: '⏸️', text: '观望', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  };
  
  const badge = badges[action] || badges.hold;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
      <span className="mr-1">{badge.emoji}</span>
      {badge.text}
    </span>
  );
}

// 单条对话展示
function ConversationCard({ item, expanded, onToggle }: { 
  item: ConversationItem; 
  expanded: boolean;
  onToggle: () => void;
}) {
  const decision = item.cot_trace || item.llm_response?.decision_normalized;
  const action = decision?.action || 'hold';
  const symbol = decision?.symbol || '';
  const reasoning = decision?.reasoning || '';
  
  const accountValue = item.account?.accountValue || 0;
  const totalReturn = item.account?.totalReturn || 0;
  
  const timestamp = new Date((item.timestamp || 0) * 1000).toLocaleString('zh-CN');
  
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <DecisionBadge action={action} />
            {symbol && (
              <span className="font-mono text-sm font-bold">{symbol}</span>
            )}
            <span className="text-xs text-gray-500">#{item.invocationCount || 0}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {item.cot_trace_summary || item.summary || reasoning}
          </p>
        </div>
        <button 
          onClick={onToggle}
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          {expanded ? '▼' : '▶'}
        </button>
      </div>
      
      {/* 账户信息 */}
      <div className="flex gap-4 text-xs text-gray-500 mb-2">
        <span>账户: ${accountValue.toFixed(2)}</span>
        <span className={totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
          收益: {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
        </span>
        <span>{timestamp}</span>
      </div>
      
      {/* 展开内容 */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {/* 市场分析 */}
          {item.llm_response?.parsed?.analysis && (
            <div>
              <h4 className="font-semibold text-sm mb-2">📊 市场分析</h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm">
                <p className="mb-2">{item.llm_response.parsed.analysis.market_summary}</p>
                {item.llm_response.parsed.analysis.key_observations && (
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {item.llm_response.parsed.analysis.key_observations.map((obs, i) => (
                      <li key={i}>{obs}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          
          {/* 主决策 */}
          {item.llm_response?.decision && (
            <div>
              <h4 className="font-semibold text-sm mb-2">🎯 主决策</h4>
              <TradingDecisionCard decision={item.llm_response.decision} />
            </div>
          )}
          
          {/* 候选决策 */}
          {item.llm_response?.trading_decisions && item.llm_response.trading_decisions.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">💡 候选决策</h4>
              <div className="space-y-2">
                {item.llm_response.trading_decisions.map((dec, i) => (
                  <TradingDecisionCard key={i} decision={dec} compact />
                ))}
              </div>
            </div>
          )}
          
          {/* 账户管理建议 */}
          {item.llm_response?.parsed?.account_management?.recommendations && (
            <div>
              <h4 className="font-semibold text-sm mb-2">💰 账户管理建议</h4>
              <ul className="list-disc list-inside space-y-1 text-xs bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                {item.llm_response.parsed.account_management.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* AI原始响应 */}
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-gray-600 dark:text-gray-400">
              查看AI原始响应
            </summary>
            <pre className="mt-2 bg-gray-50 dark:bg-gray-800 rounded p-3 overflow-x-auto text-xs">
              {item.llm_response?.raw_text || '无'}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

// 交易决策卡片
function TradingDecisionCard({ decision, compact = false }: { 
  decision: TradingDecision; 
  compact?: boolean;
}) {
  return (
    <div className={`bg-gray-50 dark:bg-gray-800 rounded p-3 ${compact ? 'text-xs' : 'text-sm'}`}>
      <div className="flex items-center gap-2 mb-2">
        <DecisionBadge action={decision.action} />
        {decision.symbol && <span className="font-mono font-bold">{decision.symbol}</span>}
      </div>
      
      {!compact && (
        <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
          {decision.quantity && <span>数量: {decision.quantity}</span>}
          {decision.leverage && <span>杠杆: {decision.leverage}x</span>}
        </div>
      )}
      
      {decision.reasoning && (
        <p className={`text-gray-600 dark:text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
          {decision.reasoning}
        </p>
      )}
    </div>
  );
}

// 主面板组件
export default function TradingConversationPanel() {
  const { items, isLoading, isError } = useConversations();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  
  const toggleExpanded = (index: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };
  
  if (isLoading) {
    return (
      <div className="text-xs text-gray-500">
        加载交易对话中…
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="text-xs text-red-500">
        加载失败，请稍后重试。
      </div>
    );
  }
  
  if (!items.length) {
    return (
      <div className="text-xs text-gray-500">
        暂无交易对话记录。
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">AI交易对话记录</h3>
        <span className="text-sm text-gray-500">{items.length} 条记录</span>
      </div>
      
      <div className="space-y-3">
        {items.map((item, index) => (
          <ConversationCard 
            key={`${item.timestamp}-${index}`}
            item={item}
            expanded={expandedIds.has(index)}
            onToggle={() => toggleExpanded(index)}
          />
        ))}
      </div>
    </div>
  );
}

