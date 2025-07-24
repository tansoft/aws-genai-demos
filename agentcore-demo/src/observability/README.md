# AWS AgentCore 可观测性

本模块为 AWS AgentCore 提供全面的可观测性功能，包括日志记录、指标收集和分布式追踪。

## 功能

- **结构化日志记录**：一致的、结构化的日志记录，支持不同的日志级别和上下文
- **指标收集**：自定义指标收集，集成 CloudWatch
- **分布式追踪**：使用 AWS X-Ray 集成的请求追踪
- **监控仪表板**：预配置的 CloudWatch 仪表板
- **本地开发支持**：用于开发和测试的本地实现

## 入门指南

### 基本用法

```typescript
import { createObservabilityManager, LogLevel, MetricUnit } from './observability';

// 创建可观测性管理器
const observability = createObservabilityManager({
  logLevel: LogLevel.INFO,
  serviceName: 'my-service',
  tracingEnabled: true
});

// 获取组件
const logger = observability.getLogger();
const metrics = observability.getMetricsCollector();
const tracer = observability.getTracer();

// 使用日志记录器
logger.info('Hello, world!');
logger.error('Something went wrong', new Error('Example error'));

// 使用指标
metrics.putMetric('RequestCount', 1, MetricUnit.COUNT);
metrics.putMetric('ResponseTime', 120, MetricUnit.MILLISECONDS);

// 使用追踪器
const segment = tracer.startSegment('MyOperation');
try {
  // 执行某些操作
  tracer.addMetadata(segment, 'result', { success: true });
} catch (error) {
  tracer.addError(segment, error);
  throw error;
} finally {
  tracer.endSegment(segment);
}
```

### 配置

可观测性管理器可以使用以下选项进行配置：

```typescript
const observability = createObservabilityManager({
  // 日志配置
  logLevel: LogLevel.INFO,
  logGroupName: 'my-service-logs',
  
  // 指标配置
  metricNamespace: 'MyService',
  
  // 追踪配置
  tracingEnabled: true,
  
  // 通用配置
  serviceName: 'my-service',
  defaultDimensions: {
    Environment: 'production',
    Region: 'us-west-2'
  }
});
```

### 特定上下文的日志记录

您可以为特定上下文创建日志记录器：

```typescript
const userLogger = observability.getLogger('user-service');
userLogger.info('User created', { userId: '123' });

const authLogger = observability.getLogger('auth-service');
authLogger.warn('Authentication failed', { username: 'example' });
```

### 设置通用上下文

您可以为所有日志消息设置通用上下文：

```typescript
logger.setContext({
  requestId: 'req-123',
  sessionId: 'sess-456'
});

// 此日志将包含上下文
logger.info('Processing request');
```

## CloudWatch 集成

### 日志记录

在 AWS 环境中运行时，日志会自动发送到 CloudWatch Logs。可以使用 `logGroupName` 选项配置日志组名称。

### 指标

在 AWS 环境中运行时，指标会自动发送到 CloudWatch Metrics。可以使用 `metricNamespace` 选项配置指标命名空间。

### 追踪

在启用了 X-Ray 的 AWS 环境中运行时，分布式追踪会自动启用。可以使用 `tracingEnabled` 选项启用或禁用追踪。

## 本地开发

在本地运行时，日志会输出到控制台，如果设置了 `LOCAL_LOG_FILE` 环境变量，则还会输出到文件。

指标会输出到控制台，如果设置了 `LOCAL_METRICS_FILE` 环境变量，则还会输出到文件。

追踪会输出到控制台，如果设置了 `LOCAL_TRACE_FILE` 环境变量，则还会输出到文件。

## 示例

请参阅 `examples` 目录中的更详细示例：

- `logging-example.ts`：演示日志记录功能
- `metrics-example.ts`：演示指标收集
- `tracing-example.ts`：演示分布式追踪
- `integrated-example.ts`：演示所有可观测性功能的集成
- `dashboard-example.ts`：演示 CloudWatch 仪表板创建
- `lambda-integration-example.ts`：演示与 AWS Lambda 的集成

## CloudFormation 资源

`cloudformation/observability.yaml` 模板提供了可观测性所需的 AWS 资源：

- CloudWatch 日志组
- CloudWatch 仪表板
- X-Ray 的 IAM 角色

使用 `scripts/deploy-observability.sh` 脚本部署资源：

```bash
./scripts/deploy-observability.sh --environment dev --service-name my-service
```