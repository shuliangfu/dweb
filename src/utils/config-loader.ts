/**
 * CLI 用配置加载器
 *
 * 在未启动完整 App 的情况下加载项目配置，
 * 供 dev、build、start、preview 等 CLI 命令使用。
 * 不依赖 ServiceContainer，仅读取 config/main.ts 系列文件。
 *
 * @module
 */

import { getEnv, join, realPath, stat } from "@dreamer/runtime-adapter";
import type { AppConfig } from "../types/app.ts";

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
 */
async function loadModuleConfig(
  filePath: string,
): Promise<Record<string, unknown> | null> {
  try {
    const resolvedPath = await realPath(filePath);
    const module = await import(`file://${resolvedPath}`);
    return module.default || module;
  } catch {
    return null;
  }
}

/**
 * 加载 main.ts 系列配置
 */
async function loadMainConfig(
  directory: string,
  env: string,
): Promise<AppConfig> {
  let config: AppConfig = {};
  const mainPath = join(directory, "main.ts");
  if (await fileExists(mainPath)) {
    const mainConfig = await loadModuleConfig(mainPath);
    if (mainConfig) {
      config = { ...config, ...mainConfig } as AppConfig;
    }
  }
  const envMainPath = join(directory, `main.${env}.ts`);
  if (await fileExists(envMainPath)) {
    const envConfig = await loadModuleConfig(envMainPath);
    if (envConfig) {
      config = { ...config, ...envConfig } as AppConfig;
    }
  }
  return config;
}

/**
 * 加载项目配置（供 CLI 使用）
 *
 * 从 config/ 或 src/config/ 加载 main.ts、main.{env}.ts，
 * 合并 common/config（若存在）。
 *
 * @param projectRoot 项目根目录（绝对路径）
 * @returns 合并后的 AppConfig，加载失败时返回空对象
 *
 * @example
 * ```ts
 * const config = await loadProjectConfig("/path/to/project");
 * console.log(config.name, config.server?.port);
 * ```
 */
export async function loadProjectConfig(
  projectRoot: string,
): Promise<AppConfig> {
  const env = getEnv("DENO_ENV") ||
    getEnv("BUN_ENV") ||
    getEnv("NODE_ENV") || "dev";

  let config: AppConfig = {};

  const commonPaths = [
    join(projectRoot, "src", "common", "config"),
    join(projectRoot, "common", "config"),
  ];
  for (const p of commonPaths) {
    const commonConfig = await loadMainConfig(p, env);
    if (Object.keys(commonConfig).length > 0) {
      config = { ...config, ...commonConfig };
      break;
    }
  }

  const appConfigDirs = [
    join(projectRoot, "config"),
    join(projectRoot, "src", "config"),
  ];
  for (const dir of appConfigDirs) {
    const dirConfig = await loadMainConfig(dir, env);
    if (Object.keys(dirConfig).length > 0) {
      config = { ...config, ...dirConfig };
    }
  }

  return config;
}
