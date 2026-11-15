/**
 * 升级提示：配置 `upgradePrompt: true` 后仅在生产环境启用；开发环境即使开启也不走这套逻辑。
 *
 * 版本来自 `AppConfig.version`。未填写或为空时即使开启也不启用。
 * 服务端提供 `GET /__version` 与 SSE `GET /__version/stream`；
 * 页面首屏注入引导标志与当前版本，监视逻辑在客户端入口中用
 * `@dreamer/storage/client` 把已确认的版本记在 localStorage（键 `dweb:app-version`）。
 */

import type { AppConfig } from "../types/app.ts";
import { isApiKind, isConsoleKind } from "../types/app.ts";
import { $tr } from "../utils/i18n.ts";
import { serializeJsonForInlineScript } from "../utils/security.ts";

/** 已开启且已读到版本时的运行时状态 */
export interface UpgradePromptState {
  enabled: true;
  version: string;
  title: string;
  message: string;
  confirm: string;
}

/**
 * 读取升级提示所用的应用版本：只认 `AppConfig.version`，去掉首尾空白后为空则视为未设置。
 * 不使用 `IApp.version` 的 `"1.0.0"` 缺省值。
 *
 * @param config 应用配置
 */
export function readAppConfigVersion(config: AppConfig): string | null {
  const version = typeof config.version === "string"
    ? config.version.trim()
    : "";
  return version || null;
}

/**
 * 是否应启用升级提示：显式 `upgradePrompt: true`，且为 web 应用，且非开发环境。
 *
 * @param config 应用配置
 * @param isDev 是否 `RUNTIME_ENV=dev`（开发环境一律不启用）
 */
export function isUpgradePromptRequested(
  config: AppConfig,
  isDev?: boolean,
): boolean {
  if (isDev) return false;
  return config.upgradePrompt === true && !isApiKind(config) &&
    !isConsoleKind(config);
}

/**
 * 解析升级提示运行时状态。未开启或读不到版本时返回 `null`。
 *
 * @param config 应用配置
 * @param isDev 是否开发环境
 */
export function resolveUpgradePrompt(
  config: AppConfig,
  isDev: boolean,
): UpgradePromptState | null {
  if (!isUpgradePromptRequested(config, isDev)) return null;
  const version = readAppConfigVersion(config);
  if (!version) return null;
  return {
    enabled: true,
    version,
    title: $tr("client.upgradePromptTitle"),
    message: $tr("client.upgradePromptMessage"),
    confirm: $tr("client.upgradePromptConfirm"),
  };
}

/**
 * 生产 HTML 在开启升级提示时应协商缓存，刷新才能拿到新文档。
 *
 * @param isDev 是否开发环境
 * @param config 应用配置
 * @returns 需要写入的 `Cache-Control`，无需时返回 `undefined`
 */
export function htmlDocumentCacheControl(
  isDev: boolean,
  config: AppConfig,
): string | undefined {
  if (isDev) return "no-cache, no-store, must-revalidate";
  if (resolveUpgradePrompt(config, isDev)) {
    return "no-cache, must-revalidate";
  }
  return undefined;
}

/**
 * 组装 HTML 响应可用的 `Cache-Control` 头。无需设置时返回空对象。
 *
 * @param isDev 是否开发环境
 * @param config 应用配置
 */
export function htmlDocumentCacheControlHeaders(
  isDev: boolean,
  config: AppConfig,
): Record<string, string> {
  const value = htmlDocumentCacheControl(isDev, config);
  return value ? { "Cache-Control": value } : {};
}

/**
 * 将升级提示引导语句追加到客户端 bootstrap（原地修改 `statements`）。
 * 监视脚本改由客户端入口导入 `@dreamer/storage/client` 后启动。
 *
 * @param statements 已有内联语句
 * @param config 应用配置
 * @param isDev 是否开发环境
 */
export function appendUpgradePromptBootstrap(
  statements: string[],
  config: AppConfig,
  isDev: boolean,
): void {
  const state = resolveUpgradePrompt(config, isDev);
  if (!state) return;
  statements.push("globalThis.__DWEB_UPGRADE_PROMPT__=true;");
  statements.push(
    `globalThis.__APP_VERSION__=${
      serializeJsonForInlineScript(state.version)
    };`,
  );
  statements.push(
    `globalThis.__DWEB_UPGRADE_PROMPT_MESSAGES__=${
      serializeJsonForInlineScript({
        title: state.title,
        message: state.message,
        confirm: state.confirm,
      })
    };`,
  );
}

export { isProjectVersionGreater } from "../utils/project-version.ts";
