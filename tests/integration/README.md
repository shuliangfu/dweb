# 集成测试

集成测试用于测试多个模块协同工作的完整流程。

## 测试结构

```
tests/integration/
├── router/          # 路由系统集成测试
├── middleware/      # 中间件链集成测试
└── rendering/       # 渲染系统测试（SSR/CSR/Hybrid）
```

## 运行集成测试

```bash
# 运行所有集成测试
deno task test:integration

# 运行特定目录的集成测试
deno test --allow-all tests/integration/router/
```

## 测试策略

集成测试与单元测试的区别：

- **单元测试**：测试单个模块的独立功能
- **集成测试**：测试多个模块协同工作的完整流程

集成测试通常需要：
- 启动实际的服务器
- 发送 HTTP 请求
- 验证完整的响应流程

