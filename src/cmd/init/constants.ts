/**
 * init 脚手架常量：菜单选项顺序、默认端口、第三方版本等
 */

import type { Engine, ExampleLevel, RenderMode, Style } from "./types.ts";

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

/** Preact 版本（deno.json imports） */
export const PREACT_VERSION = "10.28.3";

/** React / React-DOM / Scheduler 版本（deno.json imports） */
export const REACT_VERSION = "19.2.4";
export const REACT_DOM_VERSION = "19.2.4";
export const SCHEDULER_VERSION = "0.27.0";

/** Tailwind v4 相关版本 */
export const TAILWIND_VERSION = "4.1.18";
export const POSTCSS_VERSION = "8.4.39";

/** UnoCSS 相关版本 */
export const UNOCSS_CORE_VERSION = "66.0.0";
