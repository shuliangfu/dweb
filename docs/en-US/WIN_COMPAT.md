# @dreamer/dweb Windows Compatibility Analysis

> Comprehensive analysis of Windows compatibility across the framework.

---

## Executive Summary

| Category                           | Status                          | Notes                                                         |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| **Path handling**                  | ✅ Addressed                    | Unified `replace(/\\/g, "/")` + `normalizePathForCompare`     |
| **Build output inference**         | ✅ Compatible                   | `pathnameToFsPath`, `extractEntryFromLongPath`, Windows tests |
| **Config loading**                 | ✅ Fixed                        | `inferConfigDirectoryFromEntry` uses normalized paths         |
| **Client build (_client.dep.tsx)** | ✅ Fixed                        | Template literal escape `replace(/\\\\/g, "/")`               |
| **Route/component loading**        | ✅ Compatible                   | `normalizeComponentPathForLookup`, `load-route-module`        |
| **Runtime adapter**                | ✅ Via @dreamer/runtime-adapter | join, resolve, relative, cwd handle Windows                   |
| **Process spawning**               | ✅ Via runtime-adapter          | createCommand, spawn, exec use adapter                        |
| **Dependencies**                   | ⚠️ Third-party                  | Deno/Bun, esbuild, Tailwind - platform behavior varies        |

**Conclusion**: The framework has **extensive Windows compatibility** measures.
A few edge cases were fixed. Remaining risks are mainly from third-party tools
and runtime behavior.

---

## 1. Path Handling

### 1.1 Runtime Adapter (@dreamer/runtime-adapter)

- **join, resolve, dirname, basename**: All normalize `\` → `/` internally
- **relative()**: Handles cross-drive (e.g. C: vs D:), returns normalized path
- **cwd()**: Returns native format (Deno/Bun); may differ between runtimes
- **normalize()**: Supports `C:/path` and `C:\path`

### 1.2 Dweb Path Utilities

| File                           | Pattern                            | Purpose                   |
| ------------------------------ | ---------------------------------- | ------------------------- |
| `utils/path.ts`                | `resolve(p).replace(/\\/g, "/")`   | Normalize for comparison  |
| `utils/build-dirs.ts`          | `path.replace(/\\/g, "/")`         | Entry path, build output  |
| `utils/config-loader.ts`       | `resolvedPath.replace(/\\/g, "/")` | file:// URL normalization |
| `feature/module-cache.ts`      | `path.replace(/\\/g, "/")`         | Cache key                 |
| `feature/load-route-module.ts` | `path.replace(/\\/g, "/")`         | Module path lookup        |
| `feature/render-csr.ts`        | `rawPath.replace(/\\/g, "/")`      | Component path            |
| `feature/render-hybrid.ts`     | `component.replace(/\\/g, "/")`    | Hydration path            |

### 1.3 Fixed Issues

#### config.ts — `inferConfigDirectoryFromEntry`

**Issue**: `path.replace(root, "")` failed when `path` used `/` and `root` used
`\` (or vice versa).

**Fix**: Use `normalizePathForCompare()` for both before replace:

```typescript
const pathNorm = normalizePathForCompare(path);
const rootNorm = normalizePathForCompare(root);
const normalized = pathNorm.replace(rootNorm, "") || "/";
```

#### csr-client-builder.ts — `normalizeComponentPathForLookup` (generated code)

**Issue**: Template literal `.replace(/\\/g, "/")` produced
`.replace(/\/g, "/")` in output, causing esbuild "Unterminated string literal".

**Fix**: Use `.replace(/\\\\/g, "/")` in the template so the generated file
contains `.replace(/\\/g, "/")`.

---

## 2. Build Output Inference (build-dirs.ts)

### Windows-Specific Logic

- **pathnameToFsPath**: Strips leading `/` from `file://` pathname (e.g.
  `/C:/Users/...` → `C:/Users/...`)
- **extractEntryFromLongPath**: Handles `..\..\..\Users\foo\...\src\main.ts`
  style paths
- **getInferredBuildOutputDirs**: Normalizes `entry.replace(/\\/g, "/")` before
  `split("/")`

### Unit Tests

- `"Windows 反斜杠路径应正确解析（src\\main.ts → dist、dist/client）"`
- `"Windows 反斜杠超长路径应提取 src/main.ts → dist、dist/client"`

---

## 3. Platform Detection

### isWindows()

```typescript
// utils/runtime.ts
export function isWindows(): boolean {
  return platform() === "windows";
}
```

Used in:

- `build-dirs.ts`: `pathnameToFsPath` for `file://` pathname handling
- Future platform-specific logic

---

## 4. Process / CLI Commands

All CLI commands use `createCommand` from `@dreamer/runtime-adapter`:

- `dev`, `build`, `start`, `preview`, `clean`
- `fmt`, `lint`, `test`
- `db`, `update`, `upgrade`
- `setup.ts` (init)

**runtime-adapter**:

- v1.0.2 fixes Bun `createCommand` stdin (`getWriter()`), stdio mapping
  (`"null"` → `"ignore"`), and `execPath` export.

---

## 5. File Operations

- **readFile, writeFile, mkdir, remove, existsSync**: Via runtime-adapter
- **realPath**: Resolves symlinks; Deno/Bun handle Windows paths
- **readdir, stat**: Via runtime-adapter

---

## 6. Potential Remaining Issues

### 6.1 config-loader.ts — `path.slice(root.length)`

```typescript
const rel = path.slice(root.length).replace(/\\/g, "/");
```

**Risk**: If `path` and `root` use different separators,
`path.slice(root.length)` can misalign. Mitigated by `resolve` and `realPath`
returning consistent formats.

### 6.2 Third-Party Tools

- **esbuild**: Generally handles Windows paths
- **Tailwind**: May require Windows-specific config
- **Deno/Bun**: Behavior can differ by platform

### 6.3 Node.js `pathToFileURL` (config.ts)

```typescript
import { pathToFileURL } from "node:url";
```

- Uses `node:url` for `file://` URLs
- Works on Windows for `C:\path` and `C:/path`

---

## 7. Recommendations

1. **Testing**: Run `deno task dev` and `deno task build` on Windows
2. **CI**: Add Windows (e.g. `windows-latest`) to GitHub Actions
3. **Dependencies**: Keep `@dreamer/runtime-adapter` updated (e.g. ^1.0.2+)
4. **Docs**: Note Windows-specific considerations (e.g. PowerShell execution
   policy) in README

---

## 8. Summary

| Component             | Status           |
| --------------------- | ---------------- |
| Path normalization    | ✅ Extensive     |
| Config inference      | ✅ Fixed         |
| Client dep generation | ✅ Fixed         |
| Build dirs            | ✅ Covered       |
| Runtime adapter       | ✅ Used          |
| Unit tests            | ✅ Windows cases |
| E2E/manual Windows    | ⚠️ Suggested     |

The framework is **well-prepared for Windows**. Remaining work is mainly
validation and CI coverage on Windows.
