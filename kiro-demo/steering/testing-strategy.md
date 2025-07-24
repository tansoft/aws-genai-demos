# .kiro/steering/testing-strategy.md

---
inclusion: fileMatch
fileMatchPattern: "**/*.test.{ts,tsx}"
---

# 测试策略

## 测试类型与目标

### 单元测试
- 覆盖率目标：80%以上
- 对象：纯函数、自定义 Hook、工具函数
- 工具：Jest

### 集成测试
- 对象：API 端点、数据库操作
- 工具：Jest + Supertest
- 数据库：测试用 Docker 容器

### 端到端测试
- 对象：主要用户流程
- 工具：Playwright
- 执行环境：CI/CD 流水线

## 测试写法

### 测试文件放置

src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx  # 与组件放在同目录

### 测试结构（AAA 原则）

```typescript
describe('功能名', () => {
  it('期望行为', () => {
    // Arrange（准备）
    const input = 'test'

    // Act（执行）
    const result = functionToTest(input)

    // Assert（断言）
    expect(result).toBe('expected')
  })
})