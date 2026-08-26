/**
 * 从入口路径推断 config 目录（从 config.ts 拆出，行为不变）
 *
 * @module
 */

import { fileURLToPath } from "node:url";
import { DwebErrorCode, throwDwebError } from "../utils/errors.ts";
import { $tr } from "../utils/i18n.ts";
import { normalizePathForCompare } from "../utils/path.ts";
import {
  cwd,
  existsSync,
  join,
  resolve,
} from "./runtime-adapter.ts";

/** 入口 main 文件扩展名（预编译，避免重复创建）；i 标志兼容 Windows 路径大小写 */
const RE_MAIN_EXT = /main\.(ts|tsx|js|jsx)$/i;
/** 单应用开发 + src：/src/main.(ts|tsx|js|jsx) */
const RE_DEV_SINGLE_SRC = /^\/src\/main\.(ts|tsx|js|jsx)$/i;
/** 单应用开发 无 src：main.(ts|tsx|js|jsx) */
const RE_DEV_SINGLE_NO_SRC = /^\/?main\.(ts|tsx|js|jsx)$/i;
/** 多应用开发 + src：/src/<app>/main.(ts|tsx|js|jsx) */
const RE_DEV_MULTI_SRC = /^\/src\/([^/]+)\/main\.(ts|tsx|js|jsx)$/i;
/** 多应用开发 无 src：<app>/main.(ts|tsx|js|jsx) */
const RE_DEV_MULTI_NO_SRC = /^\/?([^/]+)\/main\.(ts|tsx|js|jsx)$/i;
/** 单应用生产：/<outputDir>/server.js */
const RE_PROD_SINGLE = /^\/([^/]+)\/server\.js$/i;
/** 多应用生产：/<outputDir>/<app>/server.js */
const RE_PROD_MULTI = /^\/([^/]+)\/([^/]+)\/server\.js$/i;

/** 推断结果缓存，避免热路径重复解析（key = root+path 规范化，Windows 兼容） */
let configDirCache: { key: string; value: string } | null = null;

/**
 * 从归一化入口路径推断 config 目录（内部使用预编译正则）
 *
 * @param normalized 已去掉 cwd 的路径（相对根）
 * @param hasSrcDir 项目根目录是否存在 src/
 * @returns 推断出的 config 相对路径，或 null
 */
function matchConfigDirFromNormalizedPath(
  normalized: string,
  hasSrcDir: boolean,
): string | null {
  if (RE_MAIN_EXT.test(normalized)) {
    // 开发环境
    if (RE_DEV_SINGLE_SRC.test(normalized)) return join("src", "config");
    if (RE_DEV_SINGLE_NO_SRC.test(normalized)) return join("config");
    const m2 = RE_DEV_MULTI_SRC.exec(normalized);
    if (m2) return join("src", m2[1], "config");
    const m3 = RE_DEV_MULTI_NO_SRC.exec(normalized);
    if (m3) return join(m3[1], "config");
  } else {
    // 生产环境
    const m4 = RE_PROD_SINGLE.exec(normalized);
    if (m4) return hasSrcDir ? join("src", "config") : join("config");
    const m5 = RE_PROD_MULTI.exec(normalized);
    if (m5) {
      const appDir = m5[2];
      return hasSrcDir ? join("src", appDir, "config") : join(appDir, "config");
    }
  }
  return null;
}

/**
 * 从入口模块路径推断 config 目录
 *
 * 单应用：
 * - 开发：src/main.ts → src/config；main.ts → config
 * - 生产：<outputDir>/server.js → src/config（有 src 时）或 config（无 src 时）
 *
 * 多应用：
 * - 开发：src/<app>/main.ts → src/<app>/config；<app>/main.ts → <app>/config
 * - 生产：<outputDir>/<app>/server.js → src/<app>/config（有 src 时）或 <app>/config（无 src 时）
 *
 * @returns 推断出的 config 目录（相对 cwd）
 * @throws 无法推断时抛出 ENTRY_PATH_INVALID 异常
 */
export function inferConfigDirectoryFromEntry(): string {
  try {
    const deno = (globalThis as { Deno?: { mainModule?: string } }).Deno;
    const getPath = (): string | null => {
      if (deno?.mainModule) {
        const url = deno.mainModule;
        // Windows: decodeURIComponent(url.slice(7)) 得到 "/C:/path"，resolve 与 root 比较会出错，
        // 必须用 fileURLToPath 转为平台原生路径（如 C:\path）再参与推断
        if (url.startsWith("file://")) {
          try {
            return fileURLToPath(url);
          } catch {
            return decodeURIComponent(url.slice(7));
          }
        }
        return url;
      }
      const proc = (globalThis as { process?: { argv?: string[] } }).process;
      const argv1 = proc?.argv?.[1];
      return argv1 ? resolve(cwd(), argv1) : null;
    };

    const path = getPath();
    if (!path) {
      throwDwebError(DwebErrorCode.ENTRY_PATH_INVALID, {
        reason: $tr("errors.entryPathInvalidReasonNoPath"),
        hint: $tr("errors.entryPathInvalidHint"),
        path: "unknown",
      });
    }

    const root = cwd();
    const cacheKey = normalizePathForCompare(root).toLowerCase() + "\0" +
      normalizePathForCompare(path).toLowerCase();
    if (configDirCache && configDirCache.key === cacheKey) {
      return configDirCache.value;
    }

    // 规范化后直接转小写再比较与截取，跨平台一致（Windows 盘符/路径大小写、Mac/Linux 均适用）
    const pathNorm = normalizePathForCompare(path).toLowerCase();
    const rootNorm = normalizePathForCompare(root).toLowerCase();
    let normalized: string;
    if (pathNorm.startsWith(rootNorm)) {
      normalized = pathNorm.slice(rootNorm.length).replace(/^\/?/, "/") || "/";
    } else {
      normalized = pathNorm.replace(rootNorm, "") || "/";
    }
    if (!normalized.startsWith("/")) normalized = "/" + normalized;
    const hasSrcDir = existsSync(resolve(root, "src"));

    const configDir = matchConfigDirFromNormalizedPath(normalized, hasSrcDir);
    if (configDir) {
      configDirCache = { key: cacheKey, value: configDir };
      return configDir;
    }
  } catch (err) {
    throwDwebError(DwebErrorCode.ENTRY_PATH_INVALID, {
      reason: $tr("errors.entryPathInvalidReasonNoMatch"),
      hint: $tr("errors.entryPathInvalidHint"),
      path: String(err instanceof Error ? err.message : "unknown"),
    });
  }

  throwDwebError(DwebErrorCode.ENTRY_PATH_INVALID, {
    reason: $tr("errors.entryPathInvalidReasonNoMatch"),
    hint: $tr("errors.entryPathInvalidHint"),
    path: "unknown",
  });
}
