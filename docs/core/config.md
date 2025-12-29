# 配置管理 (Config)

DWeb 框架的配置管理系统，支持加载和解析配置文件。

## 加载配置

```typescript
import { loadConfig } from "@dreamer/dweb";

// 加载默认配置
const { config, configDir } = await loadConfig();

// 加载指定配置文件
const { config } = await loadConfig("./dweb.config.ts");

// 多应用模式
const { config } = await loadConfig("./dweb.config.ts", "backend");
```

## 配置文件示例

```typescript
// dweb.config.ts
import { defineConfig } from "@dreamer/dweb";

export default defineConfig({
  port: 3000,
  host: "localhost",
  routes: {
    dir: "routes",
    ignore: ["**/*.test.ts"],
  },
  build: {
    outDir: "dist",
  },
});
```

## 配置规范化

```typescript
import { normalizeRouteConfig } from "@dreamer/dweb";

// 规范化路由配置
const routeConfig = normalizeRouteConfig({
  dir: "routes",
  ignore: ["**/*.test.ts"],
  cache: true,
  priority: "specific-first",
  apiDir: "routes/api",
});
```

## API 参考

### loadConfig

```typescript
function loadConfig(
  configPath?: string,
  appName?: string
): Promise<{ config: AppConfig; configDir: string }>
```

加载配置文件。

**参数：**
- `configPath`: 配置文件路径（可选，默认为 `dweb.config.ts`）
- `appName`: 应用名称（多应用模式使用）

**返回：**
- `config`: 配置对象
- `configDir`: 配置文件所在目录

### normalizeRouteConfig

```typescript
function normalizeRouteConfig(
  routes: string | {
    dir: string;
    ignore?: string[];
    cache?: boolean;
    priority?: "specific-first" | "order";
    apiDir?: string;
  }
): {
  dir: string;
  ignore: string[];
  cache: boolean;
  priority: "specific-first" | "order";
  apiDir: string;
}
```

规范化路由配置。

**参数：**
- `routes`: 路由配置（字符串或配置对象）

**返回：**
- 规范化后的路由配置对象

## 相关文档

- [配置文档](../configuration.md) - 完整的配置选项说明
- [路由系统](./router.md) - 文件系统路由

