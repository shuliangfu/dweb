/**
 * @module @dreamer/dweb/utils/i18n
 *
 * @fileoverview dweb 框架内置 i18n 模块
 *
 * 提供框架自身文案的国际化，包括错误消息、CLI 输出、日志等。
 * 使用 @dreamer/i18n 作为底层，挂载全局 $t()，并桥接 setDwebErrorTranslator。
 *
 * 服务端：使用 import 在构建时内联 JSON，避免运行时 fetch（打包后 import.meta.url 指向 dist，fetch 会失败）
 * 客户端：可使用 fetch 按需加载语言包
 *
 * 使用方式：
 * - 入口处调用 initDwebI18n()（无需传参，自动读取 config/main.ts 的 language）
 * - 框架内通过 $t("cli.usage")、$t("errors.DWEB_E01", { path }) 等获取翻译
 */

import { createI18n } from "@dreamer/i18n";
import type { TranslationData } from "@dreamer/i18n";
import { cwd, getEnv, resolve } from "@dreamer/runtime-adapter";
import { loadProjectConfig } from "./config-loader.ts";
import { setDwebErrorTranslator } from "./errors.ts";

// 服务端：静态 import 在构建时内联，无需运行时 fetch
import zhCN from "../locales/zh-CN/dweb.json" with { type: "json" };
import enUS from "../locales/en-US/dweb.json" with { type: "json" };

/**
 * 全局翻译函数（委托给 globalThis.$t，init 前返回 key）
 * 供框架内各模块 import 使用，解决 deno publish 时 compilerOptions.types 不生效的问题
 */
export function $t(
  key: string,
  params?: Record<string, string | number | boolean>,
): string {
  const g = globalThis as {
    $t?: (k: string, p?: Record<string, string | number | boolean>) => string;
  };
  return g.$t ? g.$t(key, params) : key;
}

/** 是否已初始化（幂等） */
let initialized = false;

/**
 * 待使用的 locale（由 setDwebLocale 设置，App 合并配置后调用）
 * 优先级最高，用于支持构造函数传入的 language 覆盖配置文件
 */
let pendingLocale: string | null = null;

/**
 * 设置待使用的 locale（在 initDwebI18n 之前调用）
 *
 * App 在合并配置后调用此方法，以便构造函数传入的 language 能覆盖配置文件。
 * 调用 initDwebI18n() 后会消费并清空。
 *
 * @param locale - 语言代码，如 zh-CN、en-US；传 undefined 可清除
 */
export function setDwebLocale(locale: string | undefined | null): void {
  pendingLocale = locale ?? null;
}

/** 支持的 locale 列表 */
const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const;

/** 默认 locale（回退语言，缺失翻译时使用） */
const DEFAULT_LOCALE = "en-US";

/**
 * 从环境变量检测系统语言
 *
 * 优先级：LANGUAGE > LC_ALL > LANG
 * 将 zh_CN 规范化为 zh-CN
 *
 * @returns 检测到的 locale，无法检测时返回 null
 */
export function detectLocale(): string | null {
  const langEnv = getEnv("LANGUAGE") || getEnv("LC_ALL") || getEnv("LANG");
  if (!langEnv) return null;

  // 取第一个（LANGUAGE 可能为 "zh_CN:en_US:en"）
  const first = langEnv.split(/[:\s]/)[0]?.trim();
  if (!first) return null;

  // 解析 zh_CN.UTF-8、en_US 等格式
  const match = first.match(/^([a-z]{2})[-_]([A-Z]{2})/i);
  if (match) {
    const normalized = `${match[1].toLowerCase()}-${match[2].toUpperCase()}`;
    if (
      SUPPORTED_LOCALES.includes(
        normalized as (typeof SUPPORTED_LOCALES)[number],
      )
    ) {
      return normalized;
    }
  }

  // 尝试主语言代码
  const primary = first.substring(0, 2).toLowerCase();
  for (const locale of SUPPORTED_LOCALES) {
    if (locale.startsWith(primary + "-") || locale === primary) {
      return locale;
    }
  }
  return null;
}

/** 预加载的翻译数据（构建时内联，服务端无需 fetch） */
const LOCALE_DATA: Record<string, TranslationData> = {
  "zh-CN": zhCN as TranslationData,
  "en-US": enUS as TranslationData,
};

/**
 * 解析 locale，优先级：setDwebLocale > 项目 config > 环境变量 > 默认
 */
async function resolveLocale(): Promise<string> {
  // 1. 显式设置（App 合并配置后调用 setDwebLocale）
  if (pendingLocale) {
    const v = pendingLocale;
    pendingLocale = null;
    return v;
  }
  // 2. 从项目 config/main.ts 读取 language（使用 resolve 确保 projectRoot 为绝对路径）
  try {
    const projectRoot = resolve(cwd());
    const config = await loadProjectConfig(projectRoot);
    if (config.language) return config.language;
  } catch {
    // 非 dweb 项目或加载失败，忽略
  }
  // 3. 环境变量
  const detected = detectLocale();
  if (detected) return detected;
  // 4. 默认
  return DEFAULT_LOCALE;
}

/**
 * 初始化 dweb 框架 i18n
 *
 * 幂等：已初始化则直接返回。无需传参，自动读取 language 配置：
 * 1. setDwebLocale() 显式设置（App 合并配置后调用）
 * 2. 项目 config/main.ts 的 language
 * 3. 环境变量 LANGUAGE/LC_ALL/LANG
 * 4. 默认 en-US
 *
 * 完成：加载翻译、挂载 globalThis.$t、桥接 setDwebErrorTranslator
 */
export async function initDwebI18n(): Promise<void> {
  if (initialized) return;

  const locale = await resolveLocale();
  const effectiveLocale = SUPPORTED_LOCALES.includes(
      locale as (typeof SUPPORTED_LOCALES)[number],
    )
    ? locale
    : DEFAULT_LOCALE;

  const zhData = LOCALE_DATA["zh-CN"];
  const enData = LOCALE_DATA["en-US"];

  const i18n = createI18n({
    defaultLocale: DEFAULT_LOCALE,
    fallbackBehavior: "default",
    locales: [...SUPPORTED_LOCALES],
    translations: {
      "zh-CN": zhData,
      "en-US": enData,
    },
  });

  i18n.setLocale(effectiveLocale);
  i18n.install();

  setDwebErrorTranslator((key, params) => {
    const g = globalThis as {
      $t?: (k: string, p?: Record<string, string | number | boolean>) => string;
    };
    if (g.$t) return g.$t(key, params);
    return key;
  });

  initialized = true;
}
