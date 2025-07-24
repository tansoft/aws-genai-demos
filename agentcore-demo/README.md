# AWS AgentCore 演示

本项目包含用于探索 AWS AgentCore 七个关键功能的演示：

1. **运行时**：适用于任何协议和任何模型的无服务器运行时
2. **内存**：短期和长期内存管理
3. **身份**：身份验证和安全管理
4. **网关**：工具集成网关，包括 AWS Lambda
5. **代码解释器**：沙盒代码执行环境
6. **浏览器**：网页浏览功能
7. **可观测性**：监控和调试工具

## 前提条件

- Node.js 16+
- 具有适当权限的 AWS 账户
- 已配置 AWS CLI

## 安装

```bash
# 克隆仓库
git clone https://github.com/tansoft/aws-genai-demos.git
cd aws-genai-demos/agentcore-demo

# 安装依赖
npm install

# 复制示例 .env 文件并更新为您的值
cp .env.example .env
```

## 配置

使用您的 AWS 凭证和配置值更新 `.env` 文件。

## 运行演示

```bash
# 构建项目
npm run build

# 运行所有演示
npm start

# 运行特定演示
npm start -- runtime
npm start -- memory
npm start -- identity
npm start -- gateway
npm start -- code-interpreter
npm start -- browser
npm start -- observability
```

## 项目结构

```
src/
├── common/         # 通用工具和类型
├── runtime/        # 运行时演示
├── memory/         # 内存演示
├── identity/       # 身份演示
├── gateway/        # 网关演示
├── code-interpreter/ # 代码解释器演示
├── browser/        # 浏览器演示
├── observability/  # 可观测性演示
└── index.ts        # 主入口点
```

## 许可证

MIT