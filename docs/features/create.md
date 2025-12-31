## 项目创建

### 使用 CLI 创建项目

```bash
# 交互式创建项目（会提示输入项目名称和配置选项）
deno run -A jsr:@dreamer/dweb/init

# 指定项目名称（跳过名称输入，直接使用提供的名称）
deno run -A jsr:@dreamer/dweb/init my-app
```

**创建过程说明：**

1. **项目名称输入**：如果未提供项目名称，会提示输入（只允许字母、数字、连字符和下划线）
2. **应用模式选择**：
   - **单应用模式**（默认）：适合简单的单页面应用或 API 服务
   - **多应用模式**：适合需要多个独立应用的场景（如前端 + 后端）
3. **Tailwind CSS 版本选择**：
   - **V4（推荐）**：最新版本，性能更好
   - **V3**：稳定版本，兼容性更好
4. **渲染模式选择**：
   - **SSR（服务端渲染）**：所有页面在服务端渲染，SEO 友好
   - **CSR（客户端渲染）**：所有页面在客户端渲染，交互性强
   - **Hybrid（混合渲染）**（默认）：根据路由自动选择渲染方式

### 项目结构

创建的项目结构如下：

```
my-app/
├── routes/              # 路由目录
│   ├── index.tsx        # 首页
│   ├── about.tsx        # 关于页面
│   └── api/             # API 路由（默认在 routes/api，可通过 apiDir 配置）
│       └── users.ts
├── components/          # 组件目录
├── assets/              # 静态资源
├── public/              # 公共文件
├── dweb.config.ts       # 配置文件
├── deno.json            # Deno 配置
└── main.ts              # 入口文件（可选）
```

### 入口文件 (main.ts)

**注意：`main.ts` 文件是可选的，不是必须的。** 框架可以通过 CLI
命令（`deno task dev` 或
`deno task start`）自动启动服务器，无需手动创建入口文件。

如果你需要自定义应用配置（如添加中间件、插件等），可以创建 `main.ts` 文件：

```typescript
// main.ts（可选）
/**
 * DWeb 框架应用配置文件
 * 用于创建应用实例并配置中间件和插件
 *
 * 注意：此文件只用于配置，不直接启动服务
 * 服务启动通过 CLI 命令：deno task dev 或 deno task start
 */

import { AppConfig, cors, i18n, store, theme } from "@dreamer/dweb";

const config: AppConfig = {
  middleware: [
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
    // 可以在这里添加更多中间件
    // (req, res, next) => {
    //   console.log('request', req.url);
    //   next();
    // }
  ],
  plugins: [
    i18n({
      languages: [
        { code: "en-US", name: "English" },
        { code: "zh-CN", name: "中文" },
      ],
      defaultLanguage: "en-US",
      translationsDir: "locales",
    }),
    theme({
      defaultTheme: "light",
      storageKey: "theme",
    }),
    store({
      persist: true,
      storageKey: "store",
    }),
    // 可以在这里注册更多插件
  ],
};

export default config;
```

**使用说明：**

- 如果存在 `main.ts` 文件，框架会自动加载并应用其中的配置
- 如果不存在 `main.ts` 文件，框架会使用 `dweb.config.ts` 中的配置
- `main.ts` 主要用于需要编程式配置的场景，如动态添加中间件或插件
- 在多应用模式下，每个应用可以有自己的 `main.ts` 文件（位于应用目录下）
