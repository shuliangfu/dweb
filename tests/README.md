# DWeb 框架测试

## 测试结构

```
tests/
├── unit/          # 单元测试
│   ├── utils/      # 工具函数测试
│   ├── core/       # 核心功能测试
│   └── middleware/ # 中间件测试
├── integration/    # 集成测试
│   ├── router/     # 路由系统集成测试
│   ├── middleware/ # 中间件集成测试
│   └── rendering/  # 渲染系统测试
└── helpers/        # 测试辅助工具
    ├── mock.ts     # Mock 工具
    └── fixtures/   # 测试数据
```

## 运行测试

```bash
# 运行所有测试
deno task test

# 运行单元测试
deno task test:unit

# 运行集成测试
deno task test:integration

# 运行测试并查看覆盖率
deno task test:coverage
```

## 测试覆盖率目标

- 第一阶段：核心功能 > 60%
- 第二阶段：整体 > 80%

