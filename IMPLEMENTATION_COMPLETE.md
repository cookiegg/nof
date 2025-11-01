# 单Bot架构组件化实现完成

## ✅ 已完成的工作

### 1. 创建了 BotControlPanel 组件
**位置**: `web/src/components/trading/BotControlPanel.tsx`

**功能**:
- 显示Bot配置（env, ai, intervalMinutes）
- 启动/停止Bot
- 显示运行状态
- 运行时禁用配置编辑
- 支持状态轮询更新

### 2. 创建了 AddBotDialog 组件
**位置**: `web/src/components/trading/AddBotDialog.tsx`

**功能**:
- 添加新Bot的对话框
- 配置Bot的env, ai, intervalMinutes, name
- 表单验证

### 3. 重构了 PromptEditorPanel
**位置**: `web/src/components/prompts/PromptEditorPanel.tsx`

**改动**:
- ✅ 移除了原有的交易控制区代码
- ✅ 集成了BotControlPanel组件
- ✅ 添加了"添加Bot"按钮和对话框
- ✅ 将prompt编辑与选中的bot对接
- ✅ Bot选择区域显示bot运行状态

## 📐 新的UI结构

```
PromptEditorPanel
├── 顶部工具栏
│   ├── [建议] [保存] [应用Prompt]
│
├── Bot选择区
│   └── 交易环境下拉框（基于选中的bot）
│
├── 交易控制区
│   ├── 如果没有bot：显示"添加Bot"按钮
│   └── 如果有bot：显示BotControlPanel组件
│
├── 添加Bot对话框（模态框）
│
└── Prompt编辑区
    ├── System Prompt
    └── User Prompt
```

## 🔄 工作流程

### 添加Bot流程
1. 用户点击"+ 添加交易Bot"
2. 弹出AddBotDialog对话框
3. 填写配置（env, ai, intervalMinutes, name）
4. 点击"添加" → 创建Bot配置，显示BotControlPanel

### 启动Bot流程
1. 在BotControlPanel中配置或修改参数
2. 点击"启动"按钮
3. 调用 `/api/nof1/ai/trading/start` API
4. 更新bot状态和promptEnv

### Prompt编辑流程
1. 选择Bot后，自动加载对应env的prompt模板
2. 编辑System Prompt和User Prompt
3. 点击"保存" → 保存到文件
4. 如果bot运行中，点击"应用Prompt" → 立即生效

## 📝 数据结构

### BotConfig
```typescript
interface BotConfig {
  id?: string;
  env: 'demo-futures' | 'demo-spot' | 'futures' | 'spot';
  ai: string;
  intervalMinutes: number;
  name?: string;
}
```

### BotStatus
```typescript
interface BotStatus {
  running: boolean;
  pid?: number;
  startedAt?: string;
  lastExitCode?: number;
  env?: string;
  ai?: string;
  intervalMinutes?: number;
}
```

## 🎯 关键特性

1. **组件化**: 交易控制逻辑独立为BotControlPanel组件
2. **状态管理**: Bot状态通过props传递和回调更新
3. **Prompt对接**: Prompt编辑自动关联到选中的bot环境
4. **向后兼容**: 如果已有运行的bot，自动创建BotConfig

## 🚀 下一步（多Bot支持）

当前实现支持单个Bot，后续可以扩展为：
- Bot列表管理（多个BotCard）
- 后端多Bot进程管理
- Bot配置持久化存储（bots.json）

