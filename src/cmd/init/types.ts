/**
 * init 脚手架用到的类型定义
 */

import type { AppLanguage } from "../../types/app.ts";

/** 应用模式 */
export type AppMode = "single" | "multi";

/** UI 引擎 */
export type Engine = "preact" | "react" | "view";

/** 样式方案 */
export type Style = "tailwind" | "unocss" | "none";

/** 渲染模式 */
export type RenderMode = "ssr" | "csr" | "ssg" | "hybrid";

/** 示例粒度 */
export type ExampleLevel = "minimal" | "with-about";

/** init 收集的选项 */
export interface InitOptions {
  /** 目标目录（绝对路径） */
  targetDir: string;
  /** 项目名称（用于 deno.json name、config） */
  projectName: string;
  /** 应用模式 */
  appMode: AppMode;
  /** 多应用时的应用名称列表（如 ["backend", "frontend"]），仅 appMode === "multi" 时有值 */
  appNames?: string[];
  /** UI 引擎 */
  engine: Engine;
  /** 渲染模式 */
  renderMode: RenderMode;
  /** 样式方案 */
  style: Style;
  /** 是否使用 src 目录 */
  useSrc: boolean;
  /** 示例代码粒度 */
  exampleLevel: ExampleLevel;
  /** 是否使用 beta 最新版（从 JSR meta.json 获取） */
  useBeta?: boolean;
}

/** JSR 获取的版本（由 fetchDreamerVersions 返回） */
export interface JsrVersions {
  dweb: string;
  render: string;
  router: string;
  plugins: string;
  /** view 模板引擎版本（选择 view 引擎时用于 deno.json imports） */
  view: string;
}

/** 样式相关上下文（单应用或多应用下路径不同，由此统一生成插件与资源路径） */
export interface StyleContext {
  useUno: boolean;
  useTailwind: boolean;
  hasStyleAssets: boolean;
  cssEntry: string;
  contentGlob: string;
  assetsRoot: string;
  distAssetsRoot: string;
  stylePluginImport: string;
  stylePluginBlock: string;
  staticPluginBlock: string;
  staticImport: string;
}

/** init main 的选项（来自 CLI --beta 等） */
export interface InitMainOptions {
  /** 是否使用 beta 最新版 */
  beta?: boolean;
}

// Re-export for getDefaultLanguage return type
export type { AppLanguage };
