# React Hybrid Flat Advanced Example

无 `src` 目录的扁平结构，前后端分离的多应用示例。

## 项目结构

```
react-hybrid-flat/advanced/
├── common/                # 共享代码
│   ├── config/            # 公共配置
│   ├── services/          # 公共服务
│   └── types/             # 类型定义
├── backend/               # 后台管理（端口 3001）
│   ├── main.ts
│   ├── routes/
│   └── assets/
├── frontend/              # 前端（端口 3000）
│   ├── main.ts
│   ├── routes/
│   └── assets/
└── deno.json
```

## 快速开始

### 开发模式

```bash
# 启动后台（端口 3001）
deno task dev:backend

# 另开终端，启动前端（端口 3000）
deno task dev:frontend
```

### 构建

```bash
deno task build:backend
deno task build:frontend
```

### 生产运行

```bash
deno task start:backend
deno task start:frontend
```

## 技术栈

- **@dreamer/dweb** - 全栈 Web 框架
- **React** - UI 库
- **Hybrid 渲染** - 服务端渲染 + 客户端激活
