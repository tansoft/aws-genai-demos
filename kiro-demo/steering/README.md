# 什么是 Steering？
Steering 通过 .kiro/steering/ 目录中的 markdown 文件为 Kiro 提供持久的项目知识。无需在每次聊天中解释您的约定，Steering 文件确保 Kiro 始终遵循您建立的模式、库和标准。

# 主要优势

一致的代码生成 - 每个组件、API 端点或测试都遵循您团队建立的模式和约定。

减少重复 - 无需在每次对话中解释项目标准。Kiro 会记住您的偏好。

团队协调 - 所有开发者都使用相同的标准，无论他们是项目新手还是资深贡献者。

可扩展的项目知识 - 随着代码库增长的文档，记录决策和模式，与项目一起演进。

# 默认 Steering 文件

Kiro 自动创建三个基础文件，建立核心项目上下文：

## 产品概述 (product.md)

定义您产品的目的、目标用户、关键功能和业务目标。这帮助 Kiro 理解技术决策背后的"为什么"，并建议与您产品目标一致的解决方案。

```markdown
# 此文件会生成在 .kiro/steering/product.md

# 产品概览

## 产品名称
MyAwesomeEC 购物平台

## 使命
为中小型在线商家提供一个简单易用、功能强大的电商建站平台

## 目标用户
- 个体经营者
- 中小企业的电商负责人
- 有意通过副业经营网店的个人用户

## 核心功能

1. 商品管理
   - 库存管理
   - 商品分类
   - 支持上传多张商品图片

2. 订单管理
   - 订单状态跟踪
   - 配送进度查询
   - 退换货流程支持

3. 客户管理
   - 用户注册与登录
   - 购买历史记录查看
   - 商品收藏与愿望清单功能

4. 支付功能
   - 支持信用卡支付（集成 Stripe）
   - 便利店付款
   - 货到付款

## 业务目标
- 月交易额突破 1 亿元
- 实现 1,000 家以上活跃商户上线运营
- 将平均订单金额稳定在 5,000 元左右
```

## 技术栈 (tech.md)

记录您选择的框架、库、开发工具和技术约束。当 Kiro 建议实现方案时，它会优先选择您已建立的技术栈而非替代方案。

```markdown
# 此文件将生成在 .kiro/steering/tech.md

# 技术栈说明

## 前端
- **框架**：Next.js 14.2.5（使用 App Router）
- **语言**：TypeScript 5.5.4
- **样式处理**：
  - Tailwind CSS 3.4.1
  - CSS Modules（组件级样式）
- **状态管理**：Zustand 4.5.4
- **表单处理**：React Hook Form 7.52.1
- **数据验证**：Zod 3.23.8

## 后端
- **运行时环境**：Node.js 20.x
- **框架**：Express 4.19.2
- **ORM 工具**：Prisma 5.17.0
- **认证机制**：NextAuth.js 4.24.7

## 数据库
- **生产环境**：PostgreSQL 15（托管于 AWS RDS）
- **开发环境**：PostgreSQL 15（通过 Docker 本地运行）
- **缓存服务**：Redis 7.2

## 基础设施 & 部署
- **前端托管**：Vercel
- **API 部署**：AWS Lambda + API Gateway
- **图片分发**：Cloudinary
- **监控系统**：Datadog

## 开发工具
- **包管理器**：pnpm 8.15.6
- **代码规范检查**：ESLint 8.57.0
- **代码格式化工具**：Prettier 3.3.3
- **测试框架**：
  - Jest 29.7.0
  - React Testing Library
  - Playwright（端到端测试）

## 注意事项
- Node.js 版本通过 `.nvmrc` 进行管理
- 必须使用 pnpm（禁止使用 npm 或 yarn）
- 已通过 Husky 设置 pre-commit 钩子
```

## 项目结构 (structure.md)

概述文件组织、命名约定、导入模式和架构决策。这确保生成的代码无缝融入您现有的代码库。

```markdown
# 此文件将生成在 .kiro/steering/structure.md

# 项目结构说明

## 目录结构
project-root/
├── .kiro/              # Kiro 配置目录
│   ├── steering/       # 项目信息（AI 使用的上下文）
│   └── settings/       # Kiro 的运行设置
├── src/
│   ├── app/            # Next.js 的 App Router 页面目录
│   │   ├── (auth)/     # 需要身份验证的页面
│   │   ├── (public)/   # 公共访问页面
│   │   ├── api/        # API 路由
│   │   └── layout.tsx  # 根级布局组件
│   ├── components/     # UI 组件目录
│   │   ├── common/     # 通用组件（例如按钮、卡片等）
│   │   ├── features/   # 按功能模块分类的组件
│   │   └── ui/         # 基础 UI 元件（输入框、标签等）
│   ├── hooks/          # 自定义 React Hooks
│   ├── lib/            # 工具方法与模块集合
│   │   ├── api/        # 封装的 API 客户端
│   │   ├── utils/      # 通用工具函数
│   │   └── constants/  # 常量定义
│   ├── stores/         # Zustand 状态管理逻辑
│   └── types/          # TypeScript 类型定义
├── prisma/
│   ├── schema.prisma   # 数据库结构定义（Prisma Schema）
│   └── migrations/     # 数据库迁移记录
├── public/             # 静态资源文件（图片、图标等）
├── tests/              # 测试文件目录（单元测试、集成测试）
└── docs/               # 项目文档与说明文件
```

这些基础文件默认包含在每次交互中，形成 Kiro 项目理解的基线。

# 创建自定义 Steering 文件
通过专门的 Steering 扩展 Kiro 的理解，满足您项目的独特需求：

导航到 Kiro 面板中的 Steering 部分
点击 + 按钮创建新的 .md 文件
选择描述性的文件名（例如 api-standards.md）
使用标准 markdown 语法编写您的指导
使用自然语言描述您的要求，然后选择Refine按钮，Kiro 会为您格式化

# 常见 Steering 文件策略
API 标准 (api-standards.md) - 定义 REST 约定、错误响应格式、认证流程和版本控制策略。包括端点命名模式、HTTP 状态码使用和请求/响应示例。

测试方法 (testing-standards.md) - 建立单元测试模式、集成测试策略、模拟方法和覆盖率期望。记录首选测试库、断言样式和测试文件组织。

代码风格 (code-conventions.md) - 指定命名模式、文件组织、导入排序和架构决策。包括首选代码结构、组件模式和要避免的反模式示例。

安全指南 (security-policies.md) - 记录认证要求、数据验证规则、输入清理标准和漏洞预防措施。包括特定于您应用程序的安全编码实践。

部署流程 (deployment-workflow.md) - 概述构建程序、环境配置、部署步骤和回滚策略。包括 CI/CD 管道详细信息和环境特定要求。

自定义 Steering 文件存储在 .kiro/steering/ 中，并立即在所有 Kiro 交互中可用。