# AWS AgentCore 运行时无服务器应用程序

本目录包含 AWS AgentCore 运行时功能的无服务器应用程序。该应用程序使用 AWS Serverless Application Model (SAM) 构建，并部署带有 API Gateway 端点的 Lambda 函数。

## 前提条件

- AWS CLI
- AWS SAM CLI
- Node.js 16+
- 具有适当权限的 AWS 账户

## 部署

您可以使用提供的脚本部署无服务器应用程序：

```bash
# 将您的 API 密钥设置为环境变量（可选）
export OPENAI_API_KEY=your-openai-api-key
export ANTHROPIC_API_KEY=your-anthropic-api-key

# 部署到开发环境
./scripts/deploy-serverless.sh dev

# 或者使用自定义模型设置部署到特定环境
export MODEL_PROVIDER=openai
export MODEL_NAME=gpt-4
export MODEL_PROTOCOL=openai
export MODEL_TEMPERATURE=0.7
export MODEL_MAX_TOKENS=1000
./scripts/deploy-serverless.sh prod
```

## 架构

无服务器应用程序包括：

1. **Lambda 函数**：处理运行时请求并与模型提供商通信
2. **API Gateway**：为 Lambda 函数提供 HTTP 端点
3. **IAM 角色**：授予 Lambda 函数必要的权限

## API 使用

部署后，您可以使用 API 端点发出完成请求：

```bash
# 从部署输出中获取 API URL
API_URL=$(cat .env.serverless | jq -r '.[] | select(.OutputKey=="RuntimeApiUrl") | .OutputValue')

# 发出简单的完成请求
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain what AWS AgentCore is in one paragraph:"
  }'

# 发出聊天完成请求
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant that explains AWS services concisely."
      },
      {
        "role": "user",
        "content": "What are the key features of AWS AgentCore?"
      }
    ]
  }'
```

## 配置

无服务器应用程序可以使用以下参数进行配置：

| 参数 | 描述 | 默认值 |
|-----------|-------------|---------|
| Environment | 部署环境 | dev |
| ModelProvider | 要使用的模型提供商（openai, anthropic） | openai |
| ModelName | 要使用的模型名称 | gpt-4 |
| ModelProtocol | 要使用的协议（openai, anthropic） | openai |
| ModelTemperature | 模型生成的温度 | 0.7 |
| ModelMaxTokens | 模型生成的最大令牌数 | 1000 |
| OpenAIApiKey | OpenAI API 密钥 | - |
| AnthropicApiKey | Anthropic API 密钥 | - |

您可以在部署期间使用 `sam deploy` 命令的 `--parameter-overrides` 选项覆盖这些参数。