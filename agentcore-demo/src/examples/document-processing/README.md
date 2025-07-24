# AWS AgentCore 文档处理

本示例演示如何使用 AWS AgentCore 的功能构建文档处理系统：

- **运行时**：用于文档分析和处理
- **浏览器**：用于从 URL 加载文档
- **内存**：用于存储处理过的文档和结果
- **可观测性**：用于日志记录、指标和追踪

## 功能

- 文档分类
- 信息提取
- 文档摘要
- 文档翻译
- 内容分析
- 敏感信息编辑
- 支持多种文档格式
- 全面的可观测性

## 架构

文档处理系统集成了多个 AWS AgentCore 组件：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│DocumentProcessor│────▶│  RuntimeService │────▶│  ModelProvider  │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         │              ┌─────────────────┐
         ├─────────────▶│ BrowserService  │
         │              └─────────────────┘
         │
         │              ┌─────────────────┐
         ├─────────────▶│ConversationMgr  │
         │              └─────────────────┘
         │
         │              ┌─────────────────┐
         └─────────────▶│ Observability   │
                        └─────────────────┘
```

## 使用方法

### 基本示例

```typescript
import { DocumentProcessor } from './document-processor';
import { RuntimeService } from '../../runtime/services/runtime-service';
import { BrowserService } from '../../browser/services/browser-service';
import { ConversationManager } from '../../memory/services/conversation-manager';
import { createObservabilityManager } from '../../observability';
import { 
  ProcessingRequest, 
  ProcessingOperation, 
  DocumentFormat 
} from './models';

// 创建依赖项
const runtimeService = new RuntimeService(/* ... */);
const browserService = new BrowserService(/* ... */);
const conversationManager = new ConversationManager(/* ... */);
const observability = createObservabilityManager();

// 创建文档处理器
const processor = new DocumentProcessor(
  {
    name: 'My Document Processor',
    modelProvider: 'openai',
    modelName: 'gpt-3.5-turbo',
    browserEnabled: true,
    memoryEnabled: true
  },
  runtimeService,
  browserService,
  conversationManager,
  observability
);

// 创建处理请求
const request: ProcessingRequest = {
  document: {
    type: 'file',
    location: '/path/to/document.txt',
    format: DocumentFormat.TEXT
  },
  operations: [
    ProcessingOperation.CLASSIFICATION,
    ProcessingOperation.EXTRACTION,
    ProcessingOperation.SUMMARIZATION
  ]
};

// 处理文档
const result = await processor.processDocument(request);
console.log(result.results);
```

### 文档来源

处理器支持多种文档来源：

- **文件**：各种格式的本地文件
- **URL**：通过 URL 访问的网页或文档
- **文本**：直接提供的原始文本内容

### 处理操作

处理器支持各种操作：

- **分类**：确定文档类型
- **提取**：从文档中提取结构化信息
- **摘要**：生成文档的简明摘要
- **翻译**：将文档翻译成另一种语言
- **分析**：分析文档的情感、实体、主题等
- **编辑**：从文档中编辑敏感信息

## 运行示例

要运行文档处理示例：

```bash
# 设置环境变量（可选）
export MODEL_PROVIDER=openai
export MODEL_NAME=gpt-3.5-turbo

# 运行示例
npx ts-node src/examples/document-processing/document-processing-example.ts
```

## 测试

示例包括单元测试：

```bash
# 运行单元测试
npm test -- src/examples/document-processing/__tests__/document-processor.test.ts
```