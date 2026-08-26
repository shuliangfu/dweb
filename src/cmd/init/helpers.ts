/**
 * init 脚手架辅助函数：校验、路径、引擎展示名、jsx 配置、样式上下文等
 */

import { basename } from "@dreamer/runtime-adapter";
import { type AppLanguage, SUPPORTED_APP_LANGUAGES } from "../../types/app.ts";
import { $tr, detectLocale } from "../../utils/i18n.ts";
import type {
  AppKind,
  Engine,
  InitAppSpec,
  InitOptions,
  StyleContext,
} from "./types.ts";

/** 应用名称合法：小写、数字、连字符 */
export function isValidAppName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(name);
}

/**
 * 解析 init 应用列表：优先 apps；否则由 appNames（全 web）或单应用 kind 推导。
 * 保证测试/旧调用方只传 appNames 时仍可工作。
 */
export function resolveApps(opts: InitOptions): InitAppSpec[] {
  if (opts.apps != null && opts.apps.length > 0) {
    return opts.apps;
  }
  if (
    opts.appMode === "multi" && opts.appNames != null &&
    opts.appNames.length > 0
  ) {
    return opts.appNames.map((name) => ({ name, kind: "web" as const }));
  }
  return [{
    name: opts.projectName,
    kind: opts.kind ?? "web",
  }];
}

/** 是否存在任一 web 应用（决定是否询问引擎/渲染/样式） */
export function hasWebApp(opts: InitOptions): boolean {
  return resolveApps(opts).some((a) => a.kind === "web");
}

/** 是否存在任一 HTTP 应用（web 或 api；console 不 listen） */
export function hasHttpApp(opts: InitOptions): boolean {
  return resolveApps(opts).some((a) => a.kind === "web" || a.kind === "api");
}

/** 按应用名取 kind；找不到时 web */
export function getAppKind(opts: InitOptions, appName?: string): AppKind {
  const apps = resolveApps(opts);
  if (appName == null) {
    return apps[0]?.kind ?? opts.kind ?? "web";
  }
  return apps.find((a) => a.name === appName)?.kind ?? "web";
}

/**
 * 为指定 kind 生成有效的样式/引擎选项副本（api/console 强制 style=none，避免写入 UI 插件）
 */
export function optsForKind(opts: InitOptions, kind: AppKind): InitOptions {
  if (kind === "web") return opts;
  return { ...opts, style: "none" };
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

/** 供模板使用的 $tr（框架 i18n），避免各 template 文件重复从 utils 引用 */
export { $tr };

/**
 * Bun 运行时下服务端构建的 external 列表（避免与动态加载的 _app 双实例导致 SSR 报错）
 * 仅当 runtime === "bun" 时返回非空；按引擎 + 样式：tailwind 时加 tailwindcss/lightningcss，unocss 不加
 * 单应用写在 config/main.ts，多应用写在 common/config/main.ts
 */
export function getBuildServerExternal(
  opts: InitOptions,
): string[] | undefined {
  if (opts.runtime !== "bun") return undefined;
  const list: string[] = [];
  if (opts.style === "tailwind") {
    list.push("tailwindcss", "lightningcss");
  }
  if (opts.engine === "preact") {
    list.push(
      "preact",
      "preact-render-to-string",
      "preact/hooks",
      "preact/jsx-runtime",
    );
  } else if (opts.engine === "react") {
    list.push(
      "react",
      "react-dom",
      "react-dom/server",
      "react/jsx-runtime",
    );
  }
  // view 引擎暂无约定 external，不追加
  return list.length > 0 ? list : undefined;
}
