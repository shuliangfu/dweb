## 构建

### 构建生产版本

#### 单应用模式

```bash
# 构建项目
deno task build

# 或使用 CLI 命令
deno run -A src/cli.ts build
```

#### 多应用模式

```bash
# 构建所有应用
deno task build

# 构建指定应用
deno run -A src/cli.ts build:app-name
```

### 构建配置

在 `dweb.config.ts` 中配置构建选项：

```typescript
export default defineConfig({
  build: {
    // 输出目录
    outDir: "dist",

    // 是否生成 source map（用于调试）
    sourcemap: true,

    // 是否压缩代码
    minify: true,

    // 目标 JavaScript 版本
    target: "es2022",
    // 其他选项
    // assetsDir: 'assets',      // 静态资源目录
    // publicDir: 'public',      // 公共文件目录
    // emptyOutDir: true,        // 构建前清空输出目录
  },
});
```

**构建输出结构：**

```
dist/
├── routes/          # 编译后的路由文件
├── assets/          # 静态资源
├── public/          # 公共文件（直接复制）
└── index.js         # 入口文件（如果存在）
```
