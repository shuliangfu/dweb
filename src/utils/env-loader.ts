/**
 * 项目环境变量自动加载工具
 *
 * 职责：
 * - 自动向上递归探测项目根目录
 * - 按照标准优先级自动加载分层 .env 文件：
 *   1. .env（全局基础）
 *   2. .env.local（全局本地私有覆盖，测试环境跳过）
 *   3. .env.[mode]（如 .env.dev, .env.prod, .env.test）
 *   4. .env.[mode].local（特定环境本地私有覆盖，测试环境跳过）
 * - 支持多应用子目录（src/common、src/[app] 等）环境文件自动级联覆盖
 * - 自动将解析结果注入到进程环境变量（setEnv），无需手动指定 --env-file
 *
 * @module
 */

import {
  cwd,
  existsSync,
  getEnv,
  join,
  readTextFile,
  readTextFileSync,
  setEnv,
} from "@dreamer/runtime-adapter";
import { findProjectRoot, findProjectRootSync } from "./project.ts";
import { configProfileFromRuntimeEnv } from "./runtime.ts";

/**
 * preloadProjectEnv 选项
 */
export interface PreloadProjectEnvOptions {
  /** 指定项目根目录（未指定时自动从 cwd 递归向上查找） */
  projectRoot?: string;
  /** 指定当前应用名称（用于加载应用私有 .env） */
  app?: string;
  /** 额外需要扫描的目录列表 */
  extraDirectories?: string[];
  /** 指定环境名（未指定时自动读取 RUNTIME_ENV，默认为 dev） */
  env?: string;
  /** 是否强制覆盖已有进程环境变量（默认 false，已有的非空系统变量优先） */
  override?: boolean;
}

/**
 * 规范化环境后缀（dev / prod / test）
 */
export function resolveConfigEnvSuffix(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s === "production" || s === "prod" || s === "build" || s === "start") {
    return "prod";
  }
  if (s === "test") return "test";
  return "dev";
}

/**
 * 解析 .env 文本内容为键值对
 * 自动忽略注释行与空行，剥离外层引号，并展开 ${VAR} 变量引用
 *
 * @param content .env 文件文本内容
 * @returns 环境变量键值字典
 */
export function parseEnvContent(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, equalIndex).trim();
    let value = trimmed.substring(equalIndex + 1).trim();

    // 移除包裹单引号或双引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // 展开变量引用 ${VAR}
    value = value.replace(/\${([^}]+)}/g, (_, varName) => {
      const trimmedVar = varName.trim();
      return getEnv(trimmedVar) || env[trimmedVar] || "";
    });

    env[key] = value;
  }

  return env;
}

/**
 * 获取单个目录下按优先级排序的 .env 候选文件名列表
 */
function getCandidateEnvFiles(dir: string, envRaw: string): string[] {
  const suffix = resolveConfigEnvSuffix(envRaw);
  const exact = envRaw.trim().toLowerCase();
  const isTest = suffix === "test";

  const files: string[] = [join(dir, ".env")];

  // .env.local（测试环境跳过）
  if (!isTest) {
    files.push(join(dir, ".env.local"));
  }

  // .env.[mode]
  files.push(join(dir, `.env.${suffix}`));
  if (exact && exact !== suffix) {
    files.push(join(dir, `.env.${exact}`));
  }

  // .env.[mode].local（测试环境跳过）
  if (!isTest) {
    files.push(join(dir, `.env.${suffix}.local`));
    if (exact && exact !== suffix) {
      files.push(join(dir, `.env.${exact}.local`));
    }
  }

  return files;
}

/**
 * 计算需要加载环境变量的目录列表
 */
function resolveDirectoriesToScan(
  projectRoot: string,
  app?: string,
  extraDirectories?: string[],
): string[] {
  const dirs: string[] = [projectRoot];

  // 公共目录
  dirs.push(join(projectRoot, "src", "common"));
  dirs.push(join(projectRoot, "common"));

  // 应用特定目录
  if (app) {
    dirs.push(join(projectRoot, "src", app));
    dirs.push(join(projectRoot, app));
  }

  // 额外自定义目录
  if (extraDirectories && extraDirectories.length > 0) {
    for (const d of extraDirectories) {
      dirs.push(join(projectRoot, d));
    }
  }

  return dirs;
}

/**
 * 将解析出的键值注入到进程环境
 */
function applyEnvToProcess(
  envMap: Record<string, string>,
  override: boolean,
): void {
  for (const [key, value] of Object.entries(envMap)) {
    if (override) {
      setEnv(key, value);
    } else {
      const existing = getEnv(key);
      if (existing === undefined || existing.trim() === "") {
        setEnv(key, value);
      }
    }
  }
}

/**
 * 自动异步预加载当前项目的全部 .env 分层环境变量并注入进程
 *
 * @param options 预加载选项
 * @returns 合并后的全部环境变量字典
 */
export async function preloadProjectEnv(
  options: PreloadProjectEnvOptions = {},
): Promise<Record<string, string>> {
  const projectRoot = options.projectRoot ??
    (await findProjectRoot(cwd()));
  const envRaw = options.env ?? configProfileFromRuntimeEnv();
  const override = options.override ?? false;

  const dirs = resolveDirectoriesToScan(
    projectRoot,
    options.app,
    options.extraDirectories,
  );
  const merged: Record<string, string> = {};

  for (const dir of dirs) {
    const candidateFiles = getCandidateEnvFiles(dir, envRaw);
    for (const filePath of candidateFiles) {
      try {
        const text = await readTextFile(filePath);
        const parsed = parseEnvContent(text);
        for (const [k, v] of Object.entries(parsed)) {
          // 避免子目录空字符串冲掉父目录已有非空值
          if (v === "" && merged[k] !== undefined && merged[k] !== "") {
            continue;
          }
          merged[k] = v;
        }
      } catch {
        // 文件不存在或不可读则忽略
      }
    }
  }

  applyEnvToProcess(merged, override);
  return merged;
}

/**
 * 自动同步预加载当前项目的全部 .env 分层环境变量并注入进程
 *
 * @param options 预加载选项
 * @returns 合并后的全部环境变量字典
 */
export function preloadProjectEnvSync(
  options: PreloadProjectEnvOptions = {},
): Record<string, string> {
  const projectRoot = options.projectRoot ?? findProjectRootSync(cwd());
  const envRaw = options.env ?? configProfileFromRuntimeEnv();
  const override = options.override ?? false;

  const dirs = resolveDirectoriesToScan(
    projectRoot,
    options.app,
    options.extraDirectories,
  );
  const merged: Record<string, string> = {};

  for (const dir of dirs) {
    const candidateFiles = getCandidateEnvFiles(dir, envRaw);
    for (const filePath of candidateFiles) {
      if (existsSync(filePath)) {
        try {
          const text = readTextFileSync(filePath);
          const parsed = parseEnvContent(text);
          for (const [k, v] of Object.entries(parsed)) {
            // 避免子目录空字符串冲掉父目录已有非空值
            if (v === "" && merged[k] !== undefined && merged[k] !== "") {
              continue;
            }
            merged[k] = v;
          }
        } catch {
          // 忽略
        }
      }
    }
  }

  applyEnvToProcess(merged, override);
  return merged;
}
