/**
 * init 脚手架用到的类型定义
 */

import type { AppKind, AppLanguage } from "../../types/app.ts";

export type { AppKind };

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

/** 运行时（Deno 写 deno.json + Docker 用 deno；Bun 写 package.json + .npmrc + Docker 用 bun） */
export type Runtime = "deno" | "bun";

/** 单个应用规格（多应用列表项；单应用也可用） */
export interface InitAppSpec {
  /** 应用目录名（多应用）或逻辑名（单应用可用 projectName） */
  name: string;
  /** 应用种类 */
  kind: AppKind;
}

/** init 收集的选项 */
export interface InitOptions {
  /** 目标目录（绝对路径） */
  targetDir: string;
  /** 项目名称（用于 deno.json name、config） */
  projectName: string;
  /** 应用模式 */
  appMode: AppMode;
  /**
   * 应用列表（推荐）。单应用一个元素；多应用 N 个。
   * 含 name + kind；console 一项目至多一个，且多应用时 name 默认 `console`
   */
  apps?: InitAppSpec[];
  /**
   * 多应用时的应用名称列表（兼容旧调用方 / 测试）。
   * 若同时提供 apps，以 apps 为准；否则视为全部 web
   */
  appNames?: string[];
  /**
   * 单应用种类（兼容字段）。若 apps 已设则忽略；缺省 web
   */
  kind?: AppKind;
  /** 运行时：deno 生成 deno.json 与 Deno Docker；bun 生成 package.json + .npmrc 与 Bun Docker */
  runtime: Runtime;
  /** UI 引擎（仅当存在 web 应用时有意义） */
  engine: Engine;
  /** 渲染模式（仅 web） */
  renderMode: RenderMode;
  /** 样式方案（仅 web；api/console 生成时强制 none） */
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
