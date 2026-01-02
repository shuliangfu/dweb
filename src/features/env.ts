/**
 * 环境变量管理模块
 * 支持 .env 文件、环境变量验证和类型转换
 */

// walk 暂时未使用，保留导入以备将来使用
// import { walk } from '@std/fs/walk';
import * as path from "@std/path";

/**
 * 环境变量存储
 */
const envStore = new Map<string, string>();

/**
 * 已加载标志
 */
let loaded = false;

/**
 * 环境文件查找顺序
 */
const ENV_FILES = [
  ".env.local",
  `.env.${Deno.env.get("DENO_ENV") || "development"}`,
  ".env",
];

/**
 * 解析 .env 文件内容
 * @param content .env 文件内容
 * @returns 解析后的环境变量对象
 */
function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    // 移除注释和空行
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // 解析 KEY=VALUE 格式
    const match = trimmed.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // 移除引号
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  }

  return env;
}

/**
 * 加载环境变量文件
 * @param filePath 文件路径
 */
function loadEnvFile(filePath: string): void {
  try {
    const content = Deno.readTextFileSync(filePath);
    const env = parseEnvFile(content);

    // 合并到环境变量存储（不覆盖已存在的）
    for (const [key, value] of Object.entries(env)) {
      if (!envStore.has(key)) {
        envStore.set(key, value);
      }
    }
  } catch (error) {
    // 文件不存在时忽略错误
    if (!(error instanceof Deno.errors.NotFound)) {
      console.warn(`加载环境变量文件失败: ${filePath}`, error);
    }
  }
}

/**
 * 加载所有环境变量文件
 */
function loadEnvFiles(): void {
  if (loaded) {
    return;
  }

  const cwd = Deno.cwd();

  // 先加载系统环境变量（优先级最高）
  for (const [key, value] of Object.entries(Deno.env.toObject())) {
    if (value) {
      envStore.set(key, value);
    }
  }

  // 按顺序加载环境文件（.env 文件中的值不会覆盖系统环境变量，只填充不存在的变量）
  for (const envFile of ENV_FILES) {
    const filePath = path.join(cwd, envFile);
    loadEnvFile(filePath);
  }

  loaded = true;
}

/**
 * 获取环境变量（字符串）
 * @param key 环境变量键名
 * @param defaultValue 默认值
 * @returns 环境变量值
 */
export function env(
  key: string,
  defaultValue?: string,
): any {
  // 如果已加载，直接返回
  if (loaded) {
    return envStore.get(key) ?? defaultValue;
  }

  loadEnvFiles();
  return envStore.get(key) ?? defaultValue;
}

/**
 * 获取环境变量（整数）
 * @param key 环境变量键名
 * @param defaultValue 默认值
 * @returns 环境变量值（整数）
 */
export async function envInt(
  key: string,
  defaultValue?: number,
): Promise<number | undefined>;
export function envInt(
  key: string,
  defaultValue?: number,
): number | undefined | Promise<number | undefined> {
  const value = env(key) as any;

  if (value instanceof Promise) {
    return value.then((v) => {
      if (v === undefined) {
        return defaultValue;
      }
      const num = parseInt(v, 10);
      return isNaN(num) ? defaultValue : num;
    });
  }

  if (value === undefined) {
    return defaultValue;
  }

  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 获取环境变量（浮点数）
 * @param key 环境变量键名
 * @param defaultValue 默认值
 * @returns 环境变量值（浮点数）
 */
export async function envFloat(
  key: string,
  defaultValue?: number,
): Promise<number | undefined>;
export function envFloat(
  key: string,
  defaultValue?: number,
): number | undefined | Promise<number | undefined> {
  const value = env(key) as any;

  if (value instanceof Promise) {
    return value.then((v) => {
      if (v === undefined) {
        return defaultValue;
      }
      const num = parseFloat(v);
      return isNaN(num) ? defaultValue : num;
    });
  }

  if (value === undefined) {
    return defaultValue;
  }

  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 获取环境变量（布尔值）
 * @param key 环境变量键名
 * @param defaultValue 默认值
 * @returns 环境变量值（布尔值）
 */
export async function envBool(
  key: string,
  defaultValue?: boolean,
): Promise<boolean | undefined>;
export function envBool(
  key: string,
  defaultValue?: boolean,
): boolean | undefined | Promise<boolean | undefined> {
  const value = env(key) as any;

  if (value instanceof Promise) {
    return value.then((v) => {
      if (v === undefined) {
        return defaultValue;
      }
      const lower = v.toLowerCase();
      return lower === "true" || lower === "1" || lower === "yes" ||
        lower === "on";
    });
  }

  if (value === undefined) {
    return defaultValue;
  }

  // 类型断言：经过前面的检查，value 应该是 string 类型
  const strValue = value as string;
  const lower = strValue.toLowerCase();
  return lower === "true" || lower === "1" || lower === "yes" || lower === "on";
}

/**
 * 获取所有环境变量
 * @returns 环境变量对象
 */
export function getAllEnv(): Record<string, string>;
export function getAllEnv():
  | Record<string, string>
  | Record<string, string> {
  if (loaded) {
    return Object.fromEntries(envStore);
  } else {
    loadEnvFiles();
    return Object.fromEntries(envStore);
  }
}

/**
 * 验证必需的环境变量
 * @param keys 必需的环境变量键名数组
 * @throws 如果缺少必需的环境变量
 */
export function validateEnv(keys: string[]): void {
  loadEnvFiles();

  const missing: string[] = [];
  for (const key of keys) {
    if (!envStore.has(key)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(", ")}`);
  }
}

/**
 * 初始化环境变量（在应用启动时调用）
 * 加载环境变量文件并通过 Deno.env.set 设置，这样就不需要导入 env 模块来读取环境变量了
 */
export function initEnv(): void {
  loadEnvFiles();

  // 将所有加载的环境变量设置到 Deno.env 中
  // 注意：系统环境变量（Deno.env.toObject()）的优先级最高，不会被覆盖
  for (const [key, value] of envStore.entries()) {
    // 只有当 Deno.env 中不存在该变量时才设置，避免覆盖系统环境变量
    if (!Deno.env.get(key)) {
      try {
        Deno.env.set(key, value);
      } catch (error) {
        // 某些环境变量可能无法设置（如只读变量），忽略错误
        console.warn(`无法设置环境变量 ${key}:`, error);
      }
    }
  }
}
