/**
 * CLI 用配置加载器
 *
 * 在未启动完整 App 的情况下加载项目配置，
 * 供 dev、build、start、preview 等 CLI 命令使用。
 * 不依赖 ServiceContainer，仅读取 config/main.ts 系列文件。
 *
 * - 指定 app 时：直接使用已知路径，不扫描（高效）
 * - 未指定 app 时：扫描项目根目录查找 config（最多 3 层），支持灵活目录结构
 *
 * @module
 */

import {
  join,
  pathToFileUrl,
  readdir,
  realPath,
  resolve,
  stat,
} from "@dreamer/runtime-adapter";
import { configProfileFromRuntimeEnv } from "./runtime.ts";
import { preloadProjectEnvSync } from "./env-loader.ts";
import { deepMergeConfig } from "../core/config.ts";
import type { AppConfig } from "../types/app.ts";

/** 扫描最大深度：root/src/app/config 为 3 层 */
const MAX_CONFIG_SCAN_DEPTH = 3;

/**
 * 检查文件是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 加载 TypeScript 模块配置
 *
 * 使用与 core/config 一致的 file:// URL 规范化，确保 Deno/Bun 正确解析。
 */
async function loadModuleConfig(
  filePath: string,
  projectRoot: string,
): Promise<Record<string, unknown> | null> {
  try {
    // Windows 兼容：以盘符开头的路径已是绝对路径
    const isAbsolute = filePath.startsWith("/") ||
      /^[A-Za-z]:[\\/]/.test(filePath);
    const absPath = isAbsolute ? filePath : resolve(projectRoot, filePath);
    // realPath 在 Windows CI 可能失败（如符号链接），失败时回退到 absPath
    let resolvedPath: string;
    try {
      resolvedPath = await realPath(absPath);
    } catch {
      resolvedPath = absPath;
    }
    // 使用 pathToFileUrl 确保 Windows 等平台 file:// URL 格式正确
    const fileUrl = pathToFileUrl(resolvedPath);
    const module = await import(fileUrl);
    return module.default || module;
  } catch {
    return null;
  }
}

/**
 * 加载 main.ts 系列配置
 * 使用深度合并：main.ts 为基础，main.{env}.ts 为覆盖，用户只需在 main.dev.ts 中写增量
 */
async function loadMainConfig(
  directory: string,
  env: string,
  projectRoot: string,
): Promise<AppConfig> {
  let config: AppConfig = {};
  const mainPath = join(directory, "main.ts");
  if (await fileExists(mainPath)) {
    const mainConfig = await loadModuleConfig(mainPath, projectRoot);
    if (mainConfig) {
      config = deepMergeConfig(config, mainConfig as AppConfig);
    }
  }
  const envMainPath = join(directory, `main.${env}.ts`);
  if (await fileExists(envMainPath)) {
    const envConfig = await loadModuleConfig(envMainPath, projectRoot);
    if (envConfig) {
      config = deepMergeConfig(config, envConfig as AppConfig);
    }
  }
  return config;
}

/**
 * 递归扫描项目根目录，查找名为 config 的目录
 *
 * @param root 项目根目录
 * @param currentDir 当前扫描目录
 * @param depth 当前深度（0 为 root）
 * @param results 收集到的 config 目录路径
 */
async function scanConfigDirs(
  root: string,
  currentDir: string,
  depth: number,
  results: string[],
): Promise<void> {
  if (depth > MAX_CONFIG_SCAN_DEPTH) return;
  try {
    const entries = await readdir(currentDir);
    for (const e of entries) {
      if (!e.isDirectory) continue;
      const fullPath = join(currentDir, e.name);
      if (e.name === "config") {
        results.push(fullPath);
      } else {
        await scanConfigDirs(root, fullPath, depth + 1, results);
      }
    }
  } catch {
    // 目录不可读时忽略
  }
}

/**
 * 判断路径是否为 common 公共配置
 * 路径包含 common 段即视为 common（如 src/common/config、common/config）
 */
function isCommonConfigPath(path: string, root: string): boolean {
  const rel = path.slice(root.length).replace(/\\/g, "/");
  return rel.includes("/common/") || rel.startsWith("common/");
}

/**
 * 从 config 路径提取应用名（非 common 时）
 * 如 root/src/backend/config -> backend, root/backend/config -> backend
 */
function getAppNameFromPath(configPath: string, root: string): string | null {
  if (isCommonConfigPath(configPath, root)) return null;
  const rel = configPath.slice(root.length).replace(/\\/g, "/");
  const parts = rel.split("/").filter(Boolean);
  // root/config -> 单应用
  // root/src/config -> 单应用
  // root/src/backend/config -> backend
  // root/backend/config -> backend
  if (parts.length === 1 && parts[0] === "config") return "";
  if (parts.length === 2 && parts[0] === "src" && parts[1] === "config") {
    return "";
  }
  if (parts.length === 3 && parts[0] === "src") return parts[1];
  if (parts.length === 2) return parts[0];
  return null;
}

/**
 * 加载项目配置（供 CLI 使用）
 *
 * - 指定 app 时：直接使用已知路径（common + app），不扫描，高效
 * - 未指定 app 时：扫描项目根目录查找 config（最多 3 层），支持灵活目录结构
 *
 * 合并顺序：common 配置 → 应用配置
 *
 * @param projectRoot 项目根目录（绝对路径）
 * @param app 多应用时传入应用名；指定时跳过扫描，直接加载 src/{app}/config 或 {app}/config
 * @returns 合并后的 AppConfig，加载失败时返回空对象
 *
 * @example
 * ```ts
 * const config = await loadProjectConfig("/path/to/project");
 * const backendConfig = await loadProjectConfig("/path/to/project", "backend");
 * ```
 */
export async function loadProjectConfig(
  projectRoot: string,
  app?: string,
): Promise<AppConfig> {
  // 自动预加载项目和应用的全部分层 .env 环境变量
  preloadProjectEnvSync({ projectRoot, app, override: false });
  const env = configProfileFromRuntimeEnv();

  const root = resolve(projectRoot);
  let config: AppConfig = {};

  if (app) {
    // 指定 app：直接使用已知路径，不扫描
    const commonPaths = [
      join(root, "src", "common", "config"),
      join(root, "common", "config"),
    ];
    for (const p of commonPaths) {
      const c = await loadMainConfig(p, env, root);
      if (Object.keys(c).length > 0) {
        config = deepMergeConfig(config, c);
        break;
      }
    }
    const appPaths = [
      join(root, "src", app, "config"),
      join(root, app, "config"),
    ];
    for (const p of appPaths) {
      const c = await loadMainConfig(p, env, root);
      if (Object.keys(c).length > 0) {
        config = deepMergeConfig(config, c);
      }
    }
    return config;
  }

  // 未指定 app：扫描查找 config 目录（最多 3 层）
  const allConfigDirs: string[] = [];
  await scanConfigDirs(root, root, 0, allConfigDirs);

  const commonDirs: string[] = [];
  const appConfigMap = new Map<string, string>();
  const singleConfigDirs: string[] = [];

  for (const p of allConfigDirs) {
    if (isCommonConfigPath(p, root)) {
      commonDirs.push(p);
    } else {
      const appName = getAppNameFromPath(p, root);
      if (appName === "") {
        singleConfigDirs.push(p);
      } else if (appName !== null) {
        appConfigMap.set(appName, p);
      }
    }
  }

  const appDirsToLoad: string[] = [];
  if (singleConfigDirs.length > 0) {
    const byLen = [...singleConfigDirs].sort((a, b) => a.length - b.length);
    appDirsToLoad.push(...byLen);
  } else if (appConfigMap.size > 0) {
    const first = [...appConfigMap.values()].sort()[0];
    appDirsToLoad.push(first);
  }

  const commonSorted = [...commonDirs].sort();
  for (const dir of commonSorted) {
    const c = await loadMainConfig(dir, env, root);
    if (Object.keys(c).length > 0) {
      config = deepMergeConfig(config, c);
    }
  }

  for (const dir of appDirsToLoad) {
    const c = await loadMainConfig(dir, env, root);
    if (Object.keys(c).length > 0) {
      config = deepMergeConfig(config, c);
    }
  }

  return config;
}
