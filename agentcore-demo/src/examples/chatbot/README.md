# AWS AgentCore 聊天机器人示例

本示例演示如何使用 AWS AgentCore 的功能构建聊天机器人：

- **运行时**：用于模型推理和协议处理
- **内存**：用于对话历史和上下文管理
- **网关**：用于工具集成和函数调用
- **可观测性**：用于日志记录、指标和追踪

## 功能

- 交互式聊天界面
- 支持多种模型提供商（OpenAI、Anthropic）
- 对话内存和上下文管理
- 通过函数调用进行工具集成
- 全面的可观测性

## 架构

聊天机器人示例集成了多个 AWS AgentCore 组件：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  ChatbotService │────▶│ RuntimeService  │────▶│  ModelProvider  │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         │              ┌─────────────────┐
         ├─────────────▶│ ConversationMgr │
         │              └─────────────────┘
         │
         │              ┌─────────────────┐
         ├─────────────▶│  ToolExecutor   │
         │              └─────────────────┘
         │
         │              ┌─────────────────┐
         └─────────────▶│  Observability  │
                        └─────────────────┘
```

## 使用方法

### 基本示例

```typescript
import { ChatbotService } from './chatbot-service';
import { RuntimeService } from '../../runtime/services/runtime-service';
import { ConversationManager } from '../../memory/services/conversation-manager';
import { ToolExecutor } from '../../gateway/services/tool-executor';
import { createObservabilityManager } from '../../observability';

// 创建依赖项
const runtimeService = new RuntimeService(/* ... */);
const conversationManager = new ConversationManager(/* ... */);
const toolExecutor = new ToolExecutor();
const observability = createObservabilityManager();

// 创建聊天机器人服务
const chatbot = new ChatbotService(
  {
    name: 'My Chatbot',
    modelProvider: 'openai',
    modelName: 'gpt-3.5-turbo',
    memoryEnabled: true,
    toolsEnabled: true
  },
  runtimeService,
  conversationManager,
  toolExecutor,
  observability
);

// 创建会话
const session = chatbot.createSession('user-123');

// 发送消息
const response = await chatbot.sendMessage(session, 'Hello, how are you?');
console.log(response.content);
```

### 工具集成

示例包括几个内置工具：

- `getCurrentDateTime`：获取当前日期和时间
- `getWeather`：获取某个位置的天气信息
- `searchInformation`：搜索某个主题的信息
- `calculateExpression`：计算数学表达式

您可以使用 `ToolExecutor` 注册自定义工具：

```typescript
toolExecutor.registerTool(
  'myCustomTool',
  'Description of my custom tool',
  {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description'
      }
    },
    required: ['param1']
  },
  async (params) => {
    // 工具实现
    return { result: 'Tool result' };
  }
);
```

## 运行示例

要运行交互式聊天机器人示例：

```bash
# 设置环境变量（可选）
export MODEL_PROVIDER=openai
export MODEL_NAME=gpt-3.5-turbo

# 运行示例
npx ts-node src/examples/chatbot/chatbot-example.ts
```

## 测试

示例包括单元测试和集成测试：

```bash
# 运行单元测试
npm test -- src/examples/chatbot/__tests__/chatbot-service.test.ts

# 运行集成测试
npm test -- src/examples/chatbot/__tests__/chatbot-integration.test.ts
```