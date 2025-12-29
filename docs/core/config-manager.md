# 配置管理器 (ConfigManager)

`ConfigManager` 统一管理应用配置的加载、验证和访问。

## 概述

`ConfigManager` 封装了配置加载逻辑，提供类型安全的配置访问和配置合并功能。

## 快速开始

### 基本使用

```typescript
import { ConfigManager } from "@dreamer/dweb";

// 创建配置管理器
const configManager = new ConfigManager("dweb.config.ts");

// 加载配置
await configManager.load();

// 获取配置
const config = configManager.getConfig();
const port = config.server?.port;
```

### 多应用模式

```typescript
// 加载特定应用的配置
const configManager = new ConfigManager("dweb.config.ts", "backend");
await configManager.load();
const config = configManager.getConfig();
```

### 程序化设置配置

```typescript
import { ConfigManager } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const configManager = new ConfigManager();

// 直接设置配置（用于测试或特殊场景）
const config: AppConfig = {
  server: { port: 3000 },
  routes: { dir: "routes" },
};

configManager.setConfig(config);
const loadedConfig = configManager.getConfig();
```

## API 参考

### 构造函数

```typescript
constructor(configPath?: string, appName?: string)
```

**参数：**
- `configPath` (可选): 配置文件路径，如果不提供则自动查找 `dweb.config.ts`
- `appName` (可选): 应用名称，用于多应用模式

### 方法

#### `load()`

加载配置文件。

```typescript
await configManager.load();
```

**功能：**
- 从配置文件加载配置
- 验证配置格式
- 规范化配置值

**抛出错误：**
- 如果配置文件不存在
- 如果配置格式错误

#### `getConfig()`

获取配置对象。

```typescript
const config = configManager.getConfig();
```

**返回：**
- `AppConfig` - 配置对象

**抛出错误：**
- 如果配置未加载

#### `getConfigDir()`

获取配置文件所在目录。

```typescript
const configDir = configManager.getConfigDir();
// 例如: "/path/to/project"
```

#### `setConfig(config)`

程序化设置配置。

```typescript
configManager.setConfig(config);
```

**参数：**
- `config`: `AppConfig` - 配置对象

**用途：**
- 测试场景
- 动态配置
- 程序化配置

#### `merge(baseConfig, appConfig)`

合并配置。

```typescript
const merged = configManager.merge(baseConfig, appConfig);
```

**参数：**
- `baseConfig`: `Partial<AppConfig>` - 基础配置
- `appConfig`: `AppConfig` - 应用配置

**返回：**
- `AppConfig` - 合并后的配置

#### `isLoaded()`

检查配置是否已加载。

```typescript
if (configManager.isLoaded()) {
  const config = configManager.getConfig();
}
```

## 配置验证

`ConfigManager` 会自动验证配置：

- 必需字段检查
- 类型检查
- 值范围检查

如果配置无效，会在 `load()` 或 `setConfig()` 时抛出错误。

## 配置合并规则

配置合并遵循以下规则：

1. 对象属性：深度合并
2. 数组：替换（不合并）
3. 基本类型：使用应用配置的值

## 完整示例

```typescript
import { ConfigManager } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

// 方式 1: 从文件加载
const configManager1 = new ConfigManager("dweb.config.ts");
await configManager1.load();
const config1 = configManager1.getConfig();

// 方式 2: 程序化设置
const configManager2 = new ConfigManager();
const config2: AppConfig = {
  server: { port: 3000, host: "localhost" },
  routes: { dir: "routes" },
  isProduction: false,
};
configManager2.setConfig(config2);

// 方式 3: 合并配置
const baseConfig: Partial<AppConfig> = {
  server: { port: 3000 },
};
const appConfig: AppConfig = {
  server: { host: "0.0.0.0" },
  routes: { dir: "routes" },
};
const merged = configManager2.merge(baseConfig, appConfig);
// merged.server.port = 3000
// merged.server.host = "0.0.0.0"
```

## 在 Application 中使用

`Application` 类内部使用 `ConfigManager` 管理配置：

```typescript
import { Application } from "@dreamer/dweb";

const app = new Application("dweb.config.ts");
await app.initialize();

// 通过服务容器获取配置管理器
const configManager = app.getService<ConfigManager>("configManager");
const config = configManager.getConfig();
```

## 相关文档

- [配置管理 (Config)](./config.md) - 配置文件格式和加载
- [应用核心类 (Application)](./application.md) - Application 类的使用
- [配置说明](../configuration.md) - 完整的配置选项说明
