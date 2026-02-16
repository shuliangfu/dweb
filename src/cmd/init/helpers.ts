/**
 * init 脚手架辅助函数：校验、路径、引擎展示名、jsx 配置、样式上下文等
 */

import { basename } from "@dreamer/runtime-adapter";
import { type AppLanguage, SUPPORTED_APP_LANGUAGES } from "../../types/app.ts";
import { $t, detectLocale } from "../../utils/i18n.ts";
import type { Engine, InitOptions, StyleContext } from "./types.ts";

/** 应用名称合法：小写、数字、连字符 */
export function isValidAppName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(name);
}

/** 从目标路径推断项目名 */
export function projectNameFromDir(targetDir: string): string {
  const name = basename(targetDir);
  return name === "." ? "my-dweb-app" : name;
}

/**
 * 根据用户语言环境（LANGUAGE/LC_ALL/LANG）返回框架 language 配置
 * 用于 init 生成的 config/main.ts 模板；检测到框架支持的语言则返回，否则回退 en-US
 */
export function getDefaultLanguage(): AppLanguage {
  const detected = detectLocale();
  if (
    detected &&
    (SUPPORTED_APP_LANGUAGES as readonly string[]).includes(detected)
  ) {
    return detected as AppLanguage;
  }
  return "en-US";
}

/** 返回引擎的展示名称（用于注释、关于页等） */
export function getEngineDisplayName(engine: Engine): string {
  return engine === "preact" ? "Preact" : engine === "view" ? "View" : "React";
}

/** 返回 deno.json compilerOptions.jsxImportSource 的值 */
export function getJsxImportSource(engine: Engine): string {
  return engine === "preact"
    ? "preact"
    : engine === "view"
    ? "@dreamer/view"
    : "react";
}

/**
 * 返回 AppProps 的 import + interface 开头（不含闭合 }），调用方追加 title/description 后闭合
 */
export function getAppPropsTypeSnippet(engine: Engine): string {
  const importType = engine === "preact"
    ? "ComponentChildren"
    : engine === "view"
    ? "VNode"
    : "ReactNode";
  const importModule = engine === "preact"
    ? "preact"
    : engine === "view"
    ? "@dreamer/view"
    : "react";
  const childrenDecl = engine === "view"
    ? "  children?: VNode | VNode[];"
    : `  children: ${importType};`;
  return `import type { ${importType} } from "${importModule}";

interface AppProps {
${childrenDecl}`;
}

/**
 * 返回 LayoutProps 的 import + 完整 interface 字符串
 */
export function getLayoutPropsTypeSnippet(engine: Engine): string {
  const importType = engine === "preact"
    ? "ComponentChildren"
    : engine === "view"
    ? "VNode"
    : "ReactNode";
  const importModule = engine === "preact"
    ? "preact"
    : engine === "view"
    ? "@dreamer/view"
    : "react";
  const childrenDecl = engine === "view"
    ? "  children?: VNode | VNode[];"
    : `  children: ${importType};`;
  return `import type { ${importType} } from "${importModule}";

interface LayoutProps {
${childrenDecl}
}`;
}

/**
 * 根据 opts 与可选 appName 生成样式相关上下文（路径、插件 import/block、static 等）
 * 单应用不传 appName；多应用传 appName 以区分各应用资源路径
 */
export function getStyleContext(
  opts: InitOptions,
  appName?: string,
): StyleContext {
  const prefix = opts.useSrc ? "src/" : "";
  const useUno = opts.style === "unocss";
  const useTailwind = opts.style === "tailwind";
  const hasStyleAssets = useUno || useTailwind;

  const assetsRoot = appName
    ? `${prefix}${appName}/assets`
    : opts.useSrc
    ? "src/assets"
    : "assets";
  const distAssetsRoot = appName
    ? `dist/${appName}/client/assets`
    : "dist/client/assets";
  const cssEntry = opts.style === "tailwind"
    ? `${
      appName ? `${prefix}${appName}/` : opts.useSrc ? "src/" : ""
    }assets/tailwind.css`
    : `${
      appName ? `${prefix}${appName}/` : opts.useSrc ? "src/" : ""
    }assets/uno.css`;
  const contentGlob = appName
    ? `./${prefix}${appName}/**/*.{ts,tsx}`
    : opts.useSrc
    ? "./src/**/*.{ts,tsx}"
    : "./**/*.{ts,tsx}";

  const stylePluginImport = useUno
    ? `import { unocssPlugin } from "@dreamer/plugins/unocss";`
    : useTailwind
    ? `import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";`
    : "";
  const staticImport = hasStyleAssets
    ? `import { staticPlugin } from "@dreamer/plugins/static";`
    : "";

  const stylePluginBlock = useUno
    ? `
app.registerPlugin(unocssPlugin({
  output: "${distAssetsRoot}",
  cssEntry: "${cssEntry}",
  content: ["${contentGlob}"],
}));`
    : useTailwind
    ? `
app.registerPlugin(tailwindPlugin({
  output: "${distAssetsRoot}",
  cssEntry: "${cssEntry}",
  assetsPath: "/assets",
}));`
    : "";
  const staticPluginBlock = hasStyleAssets
    ? `
app.registerPlugin(staticPlugin({
  statics: [
    { root: "${assetsRoot}", prefix: "/assets" },
    { root: "${distAssetsRoot}", prefix: "/assets" },
  ],
}));`
    : "";

  return {
    useUno,
    useTailwind,
    hasStyleAssets,
    cssEntry,
    contentGlob,
    assetsRoot,
    distAssetsRoot,
    stylePluginImport,
    stylePluginBlock,
    staticPluginBlock,
    staticImport,
  };
}

/** 供模板使用的 $t（i18n），避免各 template 文件重复从 utils 引用 */
export { $t };
