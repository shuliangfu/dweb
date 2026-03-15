/**
 * @module @dreamer/dweb/utils/i18n
 *
 * @fileoverview dweb 框架内置 i18n 模块
 *
 * 提供框架自身文案的国际化，包括错误消息、CLI 输出、日志等。
 * 使用 @dreamer/i18n 作为底层，不挂全局，各模块通过 import $tr 使用；并桥接 setDwebErrorTranslator。
 *
 * 使用方式：
 * - 本模块加载时自动执行顶层 await initDwebI18n()，首次 import 本模块的调用方会在 init 完成后再得到导出，无需在业务入口再 await init。
 * - locale 优先级：setDwebLocale() > 项目 AppConfig.language > 环境变量 > 默认 en-US
 * - 若未配置 language，则使用自动检测（getDefaultAppLanguage）
 */

import { createI18n, I18n, TranslationData } from "@dreamer/i18n";
import { cwd, getEnv, resolve } from "@dreamer/runtime-adapter";
import { type AppLanguage, SUPPORTED_APP_LANGUAGES } from "../types/app.ts";
import { loadProjectConfig } from "./config-loader.ts";
import { setDwebErrorTranslator } from "./errors.ts";

// 服务端：静态 import 在构建时内联，无需运行时 fetch

// 简体中文
import zhCN from "../locales/zh-CN.json" with { type: "json" };
// 繁体中文
import zhTW from "../locales/zh-TW.json" with { type: "json" };
// 英文
import enUS from "../locales/en-US.json" with { type: "json" };
// 日文
import jaJP from "../locales/ja-JP.json" with { type: "json" };
// 韩文
import koKR from "../locales/ko-KR.json" with { type: "json" };
// 西班牙文
import esES from "../locales/es-ES.json" with { type: "json" };
// 巴西葡萄牙文
import ptBR from "../locales/pt-BR.json" with { type: "json" };
// 印尼文
import idID from "../locales/id-ID.json" with { type: "json" };
// 德文
import deDE from "../locales/de-DE.json" with { type: "json" };
// 法文
import frFR from "../locales/fr-FR.json" with { type: "json" };

/** init 时创建的 dweb 实例，不挂全局，$tr 与错误翻译均用此实例 */
let dwebI18n: I18n | null = null;

/**
 * 待使用的 locale（由 setDwebLocale 在首次 init 前设置；init 后 setDwebLocale 直接改实例）
 */
let pendingLocale: string | null = null;

/** 支持的 locale 列表 */
const SUPPORTED_LOCALES = [
  "zh-CN",
  "zh-TW",
  "en-US",
  "ja-JP",
  "ko-KR",
  "es-ES",
  "pt-BR",
  "id-ID",
  "de-DE",
  "fr-FR",
] as const;

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

/**
 * 获取默认框架语言：优先从环境变量检测，否则回退为 en-US
 *
 * 供 config/main.ts 的 language 使用，实现「自动检测用户环境语言，回退 en-US」。
 *
 * @returns AppLanguage（框架支持的任一种语言）
 */
export function getDefaultAppLanguage(): AppLanguage {
  const d = detectLocale();
  if (d && (SUPPORTED_APP_LANGUAGES as readonly string[]).includes(d)) {
    return d as AppLanguage;
  }
  return "en-US";
}

/** 预加载的翻译数据（构建时内联，服务端无需 fetch） */
const LOCALE_DATA: Record<string, TranslationData> = {
  "zh-CN": zhCN as TranslationData,
  "zh-TW": zhTW as TranslationData,
  "en-US": enUS as TranslationData,
  "ja-JP": jaJP as TranslationData,
  "ko-KR": koKR as TranslationData,
  "es-ES": esES as TranslationData,
  "pt-BR": ptBR as TranslationData,
  "id-ID": idID as TranslationData,
  "de-DE": deDE as TranslationData,
  "fr-FR": frFR as TranslationData,
};

/**
 * 异步解析 locale，优先级：setDwebLocale > 项目 config/main.ts 的 language > 环境变量 > 默认
 */
async function resolveLocale(): Promise<string> {
  if (pendingLocale) {
    const v = pendingLocale;
    pendingLocale = null;
    return SUPPORTED_LOCALES.includes(
        v as (typeof SUPPORTED_LOCALES)[number],
      )
      ? v
      : DEFAULT_LOCALE;
  }
  try {
    const projectRoot = resolve(cwd());
    const config = await loadProjectConfig(projectRoot);
    if (config.language) {
      return SUPPORTED_LOCALES.includes(
          config.language as (typeof SUPPORTED_LOCALES)[number],
        )
        ? config.language
        : DEFAULT_LOCALE;
    }
  } catch {
    // 非 dweb 项目或加载失败，继续用环境变量/默认
  }
  const detected = detectLocale();
  if (detected) return detected;
  return DEFAULT_LOCALE;
}

/**
 * 初始化 dweb 框架 i18n（异步，幂等）
 *
 * 会从项目 config/main.ts 读取 language；未配置则使用环境变量检测或默认 en-US。
 * 本模块在加载时通过顶层 await 自动调用，调用方直接 import 使用 $tr 即可，无需再手动 await。
 */
async function initDwebI18n(): Promise<void> {
  if (dwebI18n) return;

  const effectiveLocale = await resolveLocale();

  const i18n = createI18n({
    defaultLocale: DEFAULT_LOCALE,
    fallbackBehavior: "default",
    locales: [...SUPPORTED_LOCALES],
    translations: LOCALE_DATA as Record<string, TranslationData>,
  });

  i18n.setLocale(effectiveLocale);
  dwebI18n = i18n;

  setDwebErrorTranslator((key, params) => {
    return $tr(key, params, effectiveLocale);
  });
}

// 顶层 await：首次 import 本模块时，会先完成 init 再对外提供 $tr 等导出（ES 模块规范，Deno/Bun/Node ESM 均支持）
await initDwebI18n();

/**
 * 设置框架使用的 locale。
 *
 * 在模块已加载（i18n 已初始化）后调用会直接更新当前 locale，供 App 合并配置后传入项目 language。
 * 在首次加载 i18n 前调用则写入 pendingLocale，会在同步 init 时使用。
 *
 * @param locale - 语言代码，如 zh-CN、en-US；传 undefined/null 可清除 pending，不改变已初始化的实例
 */
export function setDwebLocale(locale: string | undefined | null): void {
  const v = locale ?? null;
  if (dwebI18n) {
    if (
      v && SUPPORTED_LOCALES.includes(v as (typeof SUPPORTED_LOCALES)[number])
    ) {
      dwebI18n.setLocale(v);
    }
    return;
  }
  pendingLocale = v;
}

/**
 * 框架专用翻译函数：仅用本模块 init 时创建的 dweb 实例，不依赖全局。
 * 供框架内各模块 import $tr 使用，与用户项目的 $t 隔离；init 前或实例不存在时返回 key。
 *
 * @param key - 文案 key
 * @param params - 占位替换
 * @param lang - 可选，指定语言；不传则用当前实例 locale
 */
export function $tr(
  key: string,
  params?: Record<string, string | number | boolean>,
  lang?: string,
): string {
  if (!dwebI18n) return key;
  if (lang !== undefined) {
    const prev = dwebI18n.getLocale();
    dwebI18n.setLocale(lang);
    try {
      return dwebI18n.t(key, params);
    } finally {
      dwebI18n.setLocale(prev);
    }
  }
  return dwebI18n.t(key, params);
}
