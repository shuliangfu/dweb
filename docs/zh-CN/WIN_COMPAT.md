# @dreamer/dweb Windows 兼容性分析

> 框架 Windows 兼容性全面分析报告

---

## 总体结论

| 类别                             | 状态                    | 说明                                                     |
| -------------------------------- | ----------------------- | -------------------------------------------------------- |
| **路径处理**                     | ✅ 已处理               | 统一 `replace(/\\/g, "/")` + `normalizePathForCompare`   |
| **构建输出推断**                 | ✅ 兼容                 | pathnameToFsPath、extractEntryFromLongPath、Windows 单测 |
| **配置加载**                     | ✅ 已修复               | inferConfigDirectoryFromEntry 使用规范化路径             |
| **客户端构建 (_client.dep.tsx)** | ✅ 已修复               | 模板字面量转义 `replace(/\\\\/g, "/")`                   |
| **路由/组件加载**                | ✅ 兼容                 | normalizeComponentPathForLookup、load-route-module       |
| **运行时适配**                   | ✅ 通过 runtime-adapter | join、resolve、relative、cwd 处理 Windows                |
| **进程派生**                     | ✅ 通过 runtime-adapter | createCommand、spawn、exec 使用适配器                    |
| **第三方依赖**                   | ⚠️ 需关注               | Deno/Bun、esbuild、Tailwind 平台行为可能不同             |

**结论**：框架对 Windows
已有较完整的兼容支持，并在若干边缘场景做了修复。剩余风险主要来自第三方工具与运行时行为。

---

## 1. 路径处理

### 1.1 运行时适配器 (@dreamer/runtime-adapter)

- **join、resolve、dirname、basename**：内部统一将 `\` 转为 `/`
- **relative()**：正确处理跨盘符（如 C: 与 D:），返回规范化路径
- **cwd()**：返回运行时原生格式（Deno/Bun 可能不同）
- **normalize()**：支持 `C:/path`、`C:\path` 等格式

### 1.2 Dweb 路径工具

| 文件                           | 模式                               | 用途               |
| ------------------------------ | ---------------------------------- | ------------------ |
| `utils/path.ts`                | `resolve(p).replace(/\\/g, "/")`   | 比较前规范化       |
| `utils/build-dirs.ts`          | `path.replace(/\\/g, "/")`         | 入口路径、构建输出 |
| `utils/config-loader.ts`       | `resolvedPath.replace(/\\/g, "/")` | file:// URL 规范化 |
| `feature/module-cache.ts`      | `path.replace(/\\/g, "/")`         | 缓存键             |
| `feature/load-route-module.ts` | `path.replace(/\\/g, "/")`         | 模块路径查找       |
| `feature/render-csr.ts`        | `rawPath.replace(/\\/g, "/")`      | 组件路径           |
| `feature/render-hybrid.ts`     | `component.replace(/\\/g, "/")`    | 水合路径           |

### 1.3 已修复问题

#### config.ts — inferConfigDirectoryFromEntry

**问题**：`path.replace(root, "")` 在 path 使用 `/` 而 root 使用
`\`（或反之）时失效。

**修复**：两者先通过 `normalizePathForCompare()` 规范化再 replace：

```typescript
const pathNorm = normalizePathForCompare(path);
const rootNorm = normalizePathForCompare(root);
const normalized = pathNorm.replace(rootNorm, "") || "/";
```

#### csr-client-builder.ts — normalizeComponentPathForLookup（生成代码）

**问题**：模板字面量 `.replace(/\\/g, "/")` 在输出中变为
`.replace(/\/g, "/")`，引发 esbuild「Unterminated string literal」。

**修复**：模板中改为 `.replace(/\\\\/g, "/")`，使生成文件包含正确的
`.replace(/\\/g, "/")`。

#### csr-client-builder.ts — 多段 chunk 路径（isClientChunkFile / findChunkContent）

**问题**：esbuild 对 `import("./routes/index.tsx")` 可能生成 `routes/index-XXX.js`。
原有正则仅匹配单段路径（如 `/index-XXX.js`），导致 `/routes/index-XXX.js` 未被识别为 chunk，
中间件回退到 next()，chunk 404，hydration 失败（`(void 0) is not a function`）。

**修复**：`isClientChunkFile` 正则增加 `/` 支持（`[\w\[\]_\-\/]+`），hash 使用 `[a-zA-Z0-9]`（esbuild 输出小写十六进制）；`findChunkContent` 对多段 `fileName`
先用 `basename(fileName)` 查 chunkContentIndex，遍历时用 `basename(key) === basename(fileName)` 匹配。

---

## 2. 构建输出推断 (build-dirs.ts)

### Windows 相关逻辑

- **pathnameToFsPath**：去掉 file:// pathname 前导 `/`（如 `/C:/Users/...` →
  `C:/Users/...`）
- **extractEntryFromLongPath**：处理 `..\..\..\Users\foo\...\src\main.ts`
  形式的路径
- **getInferredBuildOutputDirs**：用 `entry.replace(/\\/g, "/")` 规范化后再
  `split("/")`

### 单元测试

- `"Windows 反斜杠路径应正确解析（src\\main.ts → dist、dist/client）"`
- `"Windows 反斜杠超长路径应提取 src/main.ts → dist、dist/client"`

---

## 3. 平台检测

### isWindows()

```typescript
// utils/runtime.ts
export function isWindows(): boolean {
  return platform() === "windows";
}
```

使用位置：

- `build-dirs.ts`：pathnameToFsPath 中处理 file:// pathname
- 后续平台相关逻辑

---

## 4. 进程 / CLI 命令

所有 CLI 命令均通过 `@dreamer/runtime-adapter` 的 `createCommand` 执行：

- dev、build、start、preview、clean
- fmt、lint、test
- db、update、upgrade
- setup.ts（init）

**runtime-adapter**：

- v1.0.2 修复了 Bun createCommand 的 stdin（getWriter）、stdio 映射（"null" →
  "ignore"）及 execPath 导出。

---

## 5. 文件操作

- **readFile、writeFile、mkdir、remove、existsSync**：通过 runtime-adapter
- **realPath**：解析符号链接；Deno/Bun 在 Windows 上均可工作
- **readdir、stat**：通过 runtime-adapter

---

## 6. 可能剩余问题

### 6.1 config-loader.ts — path.slice(root.length)

```typescript
const rel = path.slice(root.length).replace(/\\/g, "/");
```

**风险**：若 path 与 root 使用不同分隔符，`slice` 可能错位。通常因
`resolve`、`realPath` 返回一致格式而缓解。

### 6.2 第三方工具

- **esbuild**：一般能处理 Windows 路径
- **Tailwind**：可能需要 Windows 相关配置
- **Deno/Bun**：平台间行为可能略有差异

### 6.3 Node.js pathToFileURL (config.ts)

```typescript
import { pathToFileURL } from "node:url";
```

- 用于生成 file:// URL，支持 `C:\path`、`C:/path` 等 Windows 路径。

---

## 7. 建议

1. **测试**：在 Windows 上执行 `deno task dev`、`deno task build`
2. **CI**：在 GitHub Actions 中增加 Windows 环境（如 `windows-latest`）
3. **依赖**：保持 `@dreamer/runtime-adapter` 更新（建议 ^1.0.2+）
4. **文档**：在 README 中说明 Windows 注意事项（如 PowerShell 执行策略）

---

## 8. 总结

| 模块                   | 状态               |
| ---------------------- | ------------------ |
| 路径规范化             | ✅ 覆盖较全面      |
| 配置推断               | ✅ 已修复          |
| 客户端依赖生成         | ✅ 已修复          |
| 构建目录               | ✅ 已覆盖          |
| 运行时适配             | ✅ 使用            |
| 单元测试               | ✅ 含 Windows 用例 |
| E2E / Windows 手动验证 | ⚠️ 推荐补充        |

框架已具备较好的 Windows 兼容性，后续重点是通过实际运行和 CI 在 Windows
上做验证。
