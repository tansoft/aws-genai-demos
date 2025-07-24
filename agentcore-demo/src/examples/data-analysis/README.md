# AWS AgentCore 数据分析代理

本示例演示如何使用 AWS AgentCore 的功能构建数据分析代理：

- **代码解释器**：在沙盒环境中执行数据分析代码
- **浏览器**：用于网络研究和数据收集
- **运行时**：用于生成分析代码和总结结果
- **可观测性**：用于日志记录、指标和追踪

## 功能

- 从各种来源（文件、URL、API）进行数据分析
- 网络研究能力
- 数据分析代码生成
- 在沙盒环境中安全执行代码
- 可视化生成
- 全面的可观测性

## 架构

数据分析代理集成了多个 AWS AgentCore 组件：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│DataAnalysisAgent│────▶│  RuntimeService │────▶│  ModelProvider  │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         │              ┌─────────────────┐     ┌─────────────────┐
         ├─────────────▶│ CodeInterpreter │────▶│  DockerSandbox  │
         │              └─────────────────┘     └─────────────────┘
         │
         │              ┌─────────────────┐     ┌─────────────────┐
         ├─────────────▶│ BrowserService  │────▶│PuppeteerBrowser │
         │              └─────────────────┘     └─────────────────┘
         │
         │              ┌─────────────────┐
         └─────────────▶│ Observability   │
                        └─────────────────┘
```

## 使用方法

### 基本示例

```typescript
import { DataAnalysisAgent } from './data-analysis-agent';
import { RuntimeService } from '../../runtime/services/runtime-service';
import { CodeInterpreter } from '../../code-interpreter/services/code-interpreter';
import { BrowserService } from '../../browser/services/browser-service';
import { createObservabilityManager } from '../../observability';
import { 
  AnalysisRequest, 
  AnalysisType, 
  DataSourceType, 
  DataFormat 
} from './models';

// 创建依赖项
const runtimeService = new RuntimeService(/* ... */);
const codeInterpreter = new CodeInterpreter(/* ... */);
const browserService = new BrowserService(/* ... */);
const observability = createObservabilityManager();

// 创建数据分析代理
const agent = new DataAnalysisAgent(
  {
    name: 'My Data Analysis Agent',
    modelProvider: 'openai',
    modelName: 'gpt-3.5-turbo',
    codeInterpreterEnabled: true,
    browserEnabled: true
  },
  runtimeService,
  codeInterpreter,
  browserService,
  observability
);

// 创建分析请求
const request: AnalysisRequest = {
  dataSources: [
    {
      type: DataSourceType.FILE,
      location: '/path/to/data.csv',
      format: DataFormat.CSV
    }
  ],
  analysisType: AnalysisType.EXPLORATORY,
  question: 'What are the trends in this data?',
  includeCode: true
};

// 执行分析
const result = await agent.analyzeData(request);
console.log(result.summary);
console.log(result.insights);
```

### 网络研究

代理还可以执行网络研究：

```typescript
const researchRequest: WebResearchRequest = {
  query: 'latest trends in data analysis',
  maxResults: 5,
  includeContent: true
};

const researchResult = await agent.performWebResearch(researchRequest);
console.log(researchResult.summary);
console.log(researchResult.results);
```

## 数据来源

代理支持多种数据源类型：

- **文件**：各种格式的本地文件（CSV、JSON 等）
- **URL**：通过 URL 访问的网页或数据文件
- **API**：返回数据的 REST API 端点
- **数据库**：（计划功能）数据库连接

## 分析类型

代理支持不同类型的分析：

- **描述性**：总结和描述数据
- **探索性**：在数据中寻找模式和关系
- **预测性**：基于数据进行预测
- **规范性**：基于数据推荐行动
- **自定义**：用户定义的自定义分析

## 运行示例

要运行数据分析示例：

```bash
# 设置环境变量（可选）
export MODEL_PROVIDER=openai
export MODEL_NAME=gpt-3.5-turbo

# 运行示例
npx ts-node src/examples/data-analysis/data-analysis-example.ts
```

## 测试

示例包括单元测试：

```bash
# 运行单元测试
npm test -- src/examples/data-analysis/__tests__/data-analysis-agent.test.ts
```