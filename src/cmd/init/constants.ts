/**
 * init 脚手架常量：菜单选项顺序、默认端口、第三方版本等
 */

import type { Engine, ExampleLevel, RenderMode, Style } from "./types.ts";

/** 运行时菜单顺序（下标 0 为默认） */
export const RUNTIMES = ["deno", "bun"] as const;

/** 模板引擎菜单顺序（与 interactiveMenu 选项一致），下标 0 为默认 */
export const ENGINES: Engine[] = ["view", "preact", "react"];

/** 渲染模式菜单顺序 */
export const RENDER_MODES: RenderMode[] = ["hybrid", "ssr", "csr", "ssg"];

/** 样式方案菜单顺序 */
export const STYLES: Style[] = ["tailwind", "unocss", "none"];

/** 示例粒度菜单顺序 */
export const EXAMPLE_LEVELS: ExampleLevel[] = ["with-about", "minimal"];

/** 多应用端口起始值，单应用固定 3000 */
export const DEFAULT_PORT_BASE = 3000;

/** fetchDreamerVersions 失败时 view 引擎的兜底版本 */
export const FALLBACK_VIEW_VERSION = "1.0.6";

/**
 * Preact 基准版本（模板中写成 `^${PREACT_VERSION}`，与根项目一致）
 */
export const PREACT_VERSION = "10.29.2";

/** React / React-DOM 的范围起点必须一致，React 19 会在实际版本不一致时拒绝启动。 */
export const REACT_VERSION = "19.2.7";
export const REACT_DOM_VERSION = "19.2.7";
export const SCHEDULER_VERSION = "0.27.0";

/** Tailwind v4 / PostCSS 基准版本（输出带 ^） */
export const TAILWIND_VERSION = "4.1.18";
export const POSTCSS_VERSION = "8.5.10";

/** UnoCSS 基准版本（输出带 ^） */
export const UNOCSS_CORE_VERSION = "66.0.0";
