/**
 * @module @dreamer/dweb/utils/i18n
 *
 * @fileoverview dweb 框架内置 i18n 模块
 *
 * 提供框架自身文案的国际化，包括错误消息、CLI 输出、日志等。
 * 使用 @dreamer/i18n 作为底层，挂载全局 $t()，并桥接 setDwebErrorTranslator。
 *
 * 使用方式：
 * - 入口处调用 initDwebI18n()
 * - 框架内通过 $t("cli.usage")、$t("errors.DWEB_E01", { path }) 等获取翻译
 */

import { createI18n } from "@dreamer/i18n";
import type { TranslationData } from "@dreamer/i18n";
import { getEnv } from "@dreamer/runtime-adapter";
import { setDwebErrorTranslator } from "./errors.ts";

/** 是否已初始化（幂等） */
let initialized = false;

/** 支持的 locale 列表 */
const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const;

/** 默认 locale */
const DEFAULT_LOCALE = "zh-CN";

/**
 * 从环境变量检测系统语言
 *
 * 优先级：LANGUAGE > LC_ALL > LANG
 * 将 zh_CN 规范化为 zh-CN
 *
 * @returns 检测到的 locale，无法检测时返回 null
 */
export function detectLocale(): string | null {
  const langEnv =
    getEnv("LANGUAGE") || getEnv("LC_ALL") || getEnv("LANG");
  if (!langEnv) return null;

  // 取第一个（LANGUAGE 可能为 "zh_CN:en_US:en"）
  const first = langEnv.split(/[:\s]/)[0]?.trim();
  if (!first) return null;

  // 解析 zh_CN.UTF-8、en_US 等格式
  const match = first.match(/^([a-z]{2})[-_]([A-Z]{2})/i);
  if (match) {
    const normalized = `${match[1].toLowerCase()}-${match[2].toUpperCase()}`;
    if (SUPPORTED_LOCALES.includes(normalized as (typeof SUPPORTED_LOCALES)[number])) {
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

/**
 * 加载 dweb 框架翻译文件
 *
 * @param locale - 语言代码，如 zh-CN、en-US
 * @returns 翻译数据
 */
async function loadDwebTranslations(
  locale: string,
): Promise<TranslationData> {
  const url = new URL(
    `../locales/${locale}/dweb.json`,
    import.meta.url,
  );
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[dweb] Failed to load locale ${locale}: ${res.statusText}`);
  }
  return (await res.json()) as TranslationData;
}

/**
 * 初始化 dweb 框架 i18n
 *
 * 幂等：已初始化则直接返回。完成以下工作：
 * 1. 检测 locale（环境变量）
 * 2. 加载 zh-CN、en-US 翻译
 * 3. 创建 I18n 实例并挂载 globalThis.$t
 * 4. 桥接 setDwebErrorTranslator
 *
 * @param options - 可选配置
 * @param options.locale - 显式指定 locale，覆盖自动检测
 */
export async function initDwebI18n(options?: {
  locale?: string;
}): Promise<void> {
  if (initialized) return;

  const locale =
    options?.locale ?? detectLocale() ?? DEFAULT_LOCALE;
  const effectiveLocale = SUPPORTED_LOCALES.includes(
    locale as (typeof SUPPORTED_LOCALES)[number],
  )
    ? locale
    : DEFAULT_LOCALE;

  const [zhData, enData] = await Promise.all([
    loadDwebTranslations("zh-CN"),
    loadDwebTranslations("en-US"),
  ]);

  const i18n = createI18n({
    defaultLocale: DEFAULT_LOCALE,
    locales: [...SUPPORTED_LOCALES],
    translations: {
      "zh-CN": zhData,
      "en-US": enData,
    },
  });

  i18n.setLocale(effectiveLocale);
  i18n.install();

  setDwebErrorTranslator((key, params) => {
    const g = globalThis as { $t?: (k: string, p?: Record<string, string | number | boolean>) => string };
    if (g.$t) return g.$t(key, params);
    return key;
  });

  initialized = true;
}

/**
 * 同步初始化（用于已预加载翻译的场景，或 CLI 入口需同步时）
 *
 * 若翻译文件可同步获取，则使用此函数；否则使用 initDwebI18n。
 * 当前实现为异步加载，入口需 await initDwebI18n()。
 */
export function isDwebI18nInitialized(): boolean {
  return initialized;
}
