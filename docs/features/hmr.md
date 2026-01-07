# 热模块替换 (HMR)

DWeb 框架提供了强大的热模块替换（HMR）功能，在开发模式下自动监听文件变化并实时更新页面，无需手动刷新浏览器。

## 目录结构

```
src/features/
├── hmr.ts           # HMR 服务器实现
└── utils/
    └── script-hmr.ts  # HMR 客户端脚本生成
```

## 快速开始

HMR 功能在开发模式下自动启用，无需额外配置。

### 启动开发服务器

```bash
deno task dev
```

开发服务器启动后，HMR 会自动：
- 监听 `routes/` 目录下的文件变化
- 监听配置文件变化（如 `dweb.config.ts`）
- 通过 WebSocket 向前端推送更新

## 工作原理

### 文件监听

HMR 使用 Deno 的 `Deno.watchFs()` API 监听文件系统变化：

- **组件文件**（`.tsx`, `.ts`）：自动编译并通过 WebSocket 推送
- **样式文件**（`.css`）：自动重新加载
- **配置文件**：触发服务器重启

### WebSocket 通信

HMR 服务器在独立端口（默认 24678）上运行 WebSocket 服务器：

```typescript
// 默认 HMR 端口
const DEFAULT_HMR_PORT = 24678;
```

客户端通过 WebSocket 连接接收更新通知。

### 智能更新

HMR 会根据文件类型选择更新策略：

- **CSS 文件**：直接重新加载样式
- **组件文件**：编译后推送更新，保持组件状态
- **其他文件**：触发页面刷新

## 配置选项

在 `dweb.config.ts` 中配置 HMR：

```typescript
export default defineConfig({
  dev: {
    // HMR 服务器端口（默认 24678）
    hmrPort: 24678,
    
    // 文件变化重载延迟（毫秒，默认 300）
    reloadDelay: 300,
    
    // HMR 需要忽略的目录列表（文件变化时不会触发页面重新加载）
    // 例如：上传目录、临时文件目录等
    ignoredDirs: ['.data/uploads', 'temp', 'cache'],
  },
  static: {
    // static.extendDirs 配置的目录也会自动被 HMR 忽略
    extendDirs: [{ dir: '.data/uploads', prefix: '/uploads' }],
  },
});
```

## 文件监听范围

HMR 会自动忽略以下文件和目录：

### 默认忽略的文件

- 以 `.` 开头的文件（隐藏文件）
- 以 `.tmp` 结尾的文件
- 以 `~` 结尾的文件
- `node_modules/` 目录
- `.deno/` 目录

### 配置忽略的目录

- **`static.extendDirs` 配置的目录**：自动忽略，无需额外配置
  - 例如：上传目录、静态资源扩展目录等
- **`dev.ignoredDirs` 配置的目录**：手动指定需要忽略的目录
  - 例如：临时文件目录、缓存目录等

## 性能优化

### 编译缓存

HMR 使用编译缓存来提升响应速度：

- 缓存已编译的组件代码
- 根据文件修改时间判断是否需要重新编译
- 减少重复编译，提升更新速度

### 防抖处理

文件变化事件使用防抖处理，避免频繁触发更新：

```typescript
// 默认延迟 300 毫秒
reloadDelay: 300
```

## 使用示例

### 开发流程

1. **启动开发服务器**：
   ```bash
   deno task dev
   ```

2. **修改文件**：
   - 修改 `routes/index.tsx`
   - 保存文件

3. **自动更新**：
   - HMR 检测到文件变化
   - 自动编译组件
   - 通过 WebSocket 推送更新
   - 浏览器自动更新，无需刷新

### 调试 HMR

如果 HMR 不工作，检查：

1. **WebSocket 连接**：
   - 打开浏览器开发者工具
   - 查看 Network 标签页
   - 确认 WebSocket 连接正常

2. **端口冲突**：
   - 检查 HMR 端口是否被占用
   - 修改 `hmrPort` 配置

3. **文件监听**：
   - 确认文件在监听范围内
   - 检查文件是否被忽略

## 注意事项

- HMR 仅在开发模式下启用
- 生产环境不会启动 HMR 服务器
- 某些文件变化可能需要手动刷新（如 `_app.tsx`）
- 大量文件同时变化可能导致短暂延迟

## 相关文档

- [开发服务器](./dev.md) - 开发模式服务器
- [开发指南](../development.md) - 完整的开发流程

