#!/usr/bin/env -S deno run -A
/**
 * dweb 项目初始化脚本（脚手架）
 *
 * 依赖：@dreamer/console、@dreamer/runtime-adapter、dweb 内部 utils/version
 * - 版本与 deno.json 读取统一由 src/utils/version.ts 提供（DWEB_VERSION、loadDwebDenoJson 等）
 * - 兼容 Deno 与 Bun，禁止直接使用 Deno.* / Bun.*，统一走 runtime-adapter
 *
 * 运行方式：
 * - Deno: deno run -A src/cmd/init.ts [目录名]
 * - Bun:  bun run src/cmd/init.ts [目录名]
 */

import {
  confirm,
  error as consoleError,
  failSpinner,
  info,
  input,
  interactiveMenu,
  prompt,
  separator,
  startSpinner,
  succeedSpinner,
  success,
  title,
} from "@dreamer/console";
import {
  args,
  basename,
  cwd,
  ensureDir,
  exists,
  exit,
  join,
  resolve,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import type { AppLanguage } from "../types/app.ts";
import { $t, detectLocale } from "../utils/i18n.ts";
import { fetchDreamerVersions } from "../utils/jsr-versions.ts";
import {
  type DwebDenoConfig,
  FALLBACK_DWEB_VERSION,
  loadDwebDenoJson,
} from "../utils/version.ts";

/** 从 version 导出，供依赖 init 的调用方使用 */
export { loadDwebDenoJson };
export type { DwebDenoConfig };

/** 应用模式 */
type AppMode = "single" | "multi";

/** UI 引擎 */
type Engine = "preact" | "react";

/** 样式方案 */
type Style = "tailwind" | "unocss" | "none";

/** 渲染模式 */
type RenderMode = "ssr" | "csr" | "ssg" | "hybrid";

/** 示例粒度 */
type ExampleLevel = "minimal" | "with-about";

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

/** 应用名称合法：小写、数字、连字符 */
function isValidAppName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(name);
}

/** 从目标路径推断项目名 */
function projectNameFromDir(targetDir: string): string {
  const name = basename(targetDir);
  return name === "." ? "my-dweb-app" : name;
}

/**
 * 根据用户语言环境（LANGUAGE/LC_ALL/LANG）返回框架 language 配置
 * 用于 init 生成的 config/main.ts 模板
 */
function getDefaultLanguage(): AppLanguage {
  const detected = detectLocale();
  if (detected === "zh-CN" || detected === "en-US") return detected;
  return "zh-CN";
}

/**
 * 交互式收集 init 选项
 *
 * @param overrideArgv 可选，由 CLI 传入的子命令参数（如 ["my-app"]），有则用作项目名称，无则用 process args 或交互输入
 * @param useBeta 可选，是否使用 beta 最新版（来自 --beta 参数）
 */
export async function collectOptions(
  overrideArgv?: string[],
  useBeta?: boolean,
): Promise<InitOptions> {
  title("dweb init");
  info($t("init.creatingProject"));
  separator();

  const argv = overrideArgv ?? args();
  let targetDirRaw: string;
  if (argv.length > 0) {
    targetDirRaw = argv[0].trim();
    info($t("init.projectNameFromArg", { name: targetDirRaw }));
  } else {
    const inputDir = await input(
      $t("init.projectNamePrompt"),
      (v) => {
        const t = v.trim();
        if (!t) return $t("init.projectNameRequired");
        if (t !== "." && !isValidAppName(t)) {
          return $t("init.projectNameInvalid");
        }
        return null;
      },
      true,
    );
    targetDirRaw = inputDir.trim();
  }

  const root = cwd();
  const targetDir = targetDirRaw === "." ? root : resolve(root, targetDirRaw);
  const projectName = targetDirRaw === "."
    ? projectNameFromDir(root)
    : targetDirRaw;

  const appModeIdx = await interactiveMenu(
    $t("init.appMode"),
    [$t("init.appModeSingle"), $t("init.appModeMulti")],
    0,
  );
  const appMode: AppMode = appModeIdx === 0 ? "single" : "multi";

  /** 多应用时循环输入应用名称，每行一个，空回车结束，至少保留一个 */
  const appNames: string[] = [];
  if (appMode === "multi") {
    info($t("init.appNamesHint"));
    while (true) {
      const hint = appNames.length > 0
        ? $t("init.appNamePromptWithAdded", { apps: appNames.join(", ") })
        : $t("init.appNamePromptEmpty");
      const line = await prompt(hint);
      const name = line?.trim() ?? "";
      if (name === "") {
        if (appNames.length === 0) {
          consoleError($t("init.appNameMinOne"));
          continue;
        }
        break;
      }
      if (!isValidAppName(name)) {
        consoleError($t("init.appNameInvalid", { name }));
        continue;
      }
      if (appNames.includes(name)) {
        consoleError($t("init.appNameDuplicate", { name }));
        continue;
      }
      appNames.push(name);
    }
  }

  const engineIdx = await interactiveMenu(
    $t("init.uiEngine"),
    [$t("init.uiEnginePreact"), $t("init.uiEngineReact")],
    0,
  );
  const engine: Engine = engineIdx === 0 ? "preact" : "react";

  const renderModeIdx = await interactiveMenu(
    $t("init.renderMode"),
    [
      $t("init.renderModeHybrid"),
      $t("init.renderModeSsr"),
      $t("init.renderModeCsr"),
      $t("init.renderModeSsg"),
    ],
    0,
  );
  const renderMode: RenderMode = (["hybrid", "ssr", "csr", "ssg"] as const)[
    renderModeIdx
  ];

  const styleIdx = await interactiveMenu(
    $t("init.style"),
    [$t("init.styleTailwind"), $t("init.styleUno"), $t("init.styleNone")],
    0,
  );
  const style: Style = styleIdx === 0
    ? "tailwind"
    : styleIdx === 1
    ? "unocss"
    : "none";

  const useSrc = await confirm($t("init.useSrc"), true);

  const exampleIdx = await interactiveMenu(
    $t("init.exampleLevel"),
    [$t("init.exampleWithAbout"), $t("init.exampleMinimal")],
    0,
  );
  const exampleLevel: ExampleLevel = exampleIdx === 0
    ? "with-about"
    : "minimal";

  return {
    targetDir,
    projectName,
    appMode,
    appNames: appMode === "multi" ? appNames : undefined,
    engine,
    renderMode,
    style,
    useSrc,
    exampleLevel,
    useBeta: useBeta ?? false,
  };
}

// ---------- 模板（版本与 deno.json 由 utils/version 提供） ----------

/** JSR 获取的版本（由 fetchDreamerVersions 返回） */
interface JsrVersions {
  dweb: string;
  render: string;
  router: string;
  plugins: string;
}

function getDenoJson(opts: InitOptions, jsrVersions: JsrVersions): string {
  const prefix = opts.useSrc ? "src/" : "";
  const isPreact = opts.engine === "preact";
  const useUno = opts.style === "unocss";
  const useTailwind = opts.style === "tailwind";
  const hasStyleAssets = useUno || useTailwind;
  const dwebVersion = jsrVersions.dweb;
  const pluginsVersion = jsrVersions.plugins;
  const renderSpec = `jsr:@dreamer/render@^${jsrVersions.render}`;
  const routerSpec = `jsr:@dreamer/router@^${jsrVersions.router}`;
  /** @dreamer/* 依赖：dweb、render、router 必选；plugins 按样式方案（仅主包，子路径由解析器自动处理） */
  const dreamerImports = [
    `    "@dreamer/dweb": "jsr:@dreamer/dweb@^${dwebVersion}"`,
    `    "@dreamer/render": "${renderSpec}"`,
    `    "@dreamer/router": "${routerSpec}"`,
    ...(hasStyleAssets
      ? [`    "@dreamer/plugins": "jsr:@dreamer/plugins@^${pluginsVersion}"`]
      : []),
  ].join(",\n");
  /** Tailwind 相关 npm 依赖（postcss、tailwindcss、@tailwindcss/postcss） */
  const tailwindNpmImports = useTailwind
    ? `    "postcss": "npm:postcss@8.4.39",
    "tailwindcss": "npm:tailwindcss@4.1.18",
    "@tailwindcss/postcss": "npm:@tailwindcss/postcss@4.1.18"`
    : "";
  /** UnoCSS 相关 npm 依赖 */
  const unocssNpmImports = useUno
    ? `    "@unocss/core": "npm:@unocss/core@66.0.0",
    "@unocss/preset-wind3": "npm:@unocss/preset-wind3@66.0.0",
    "@unocss/preset-icons": "npm:@unocss/preset-icons@66.0.0"`
    : "";
  /** 其他依赖（preact/react、npm） */
  const otherImports = isPreact
    ? `    "preact": "npm:preact@10.28.0",
    "preact/hooks": "npm:preact@10.28.0/hooks",
    "preact/jsx-runtime": "npm:preact@10.28.0/jsx-runtime",
    "preact-render-to-string": "npm:preact-render-to-string@6.5.0"`
    : `    "react": "npm:react@18.3.1",
    "react-dom": "npm:react-dom@18.3.1",
    "scheduler": "npm:scheduler@0.25.0",
    "react-dom/client": "npm:react-dom@18.3.1/client",
    "react/jsx-runtime": "npm:react@18.3.1/jsx-runtime"`;
  const jsxImportSource = isPreact ? "preact" : "react";

  /** 多应用：按应用名生成 dev/build/start tasks，以及目录别名（放在 imports 最上面） */
  const isMulti = opts.appMode === "multi" && (opts.appNames?.length ?? 0) > 0;
  const commonPath = opts.useSrc ? "./src/common/" : "./common/";
  /** 多应用时：dev 放一起、build 放一起、start 放一起，空行分开 */
  const tasksBlock = isMulti && opts.appNames
    ? [
      opts.appNames
        .map((app) => `    "dev:${app}": "deno run -A ${prefix}${app}/main.ts"`)
        .join(",\n"),
      opts.appNames
        .map(
          (app) =>
            `    "build:${app}": "deno run -A ${prefix}${app}/main.ts --build"`,
        )
        .join(",\n"),
      opts.appNames
        .map(
          (app) => `    "start:${app}": "deno run -A dist/${app}/server.js"`,
        )
        .join(",\n"),
    ].join(",\n\n")
    : `    "dev": "deno run -A ${prefix}main.ts",
    "build": "deno run -A ${prefix}main.ts --build",
    "start": "deno run -A dist/server.js"`;
  /** 多应用时，把 @common/ 与各应用目录别名放在 imports 最上面 */
  const appDirPrefix = opts.useSrc ? "./src/" : "./";
  const dirAliasesBlock = isMulti && opts.appNames
    ? [
      `    "@common/": "${commonPath}"`,
      ...opts.appNames.map(
        (app) => `    "@${app}/": "${appDirPrefix}${app}/"`,
      ),
    ].join(",\n") + ",\n\n"
    : "";

  return `{
  "version": "1.0.0",
  "tasks": {
${tasksBlock}
  },
  "imports": {
${dirAliasesBlock}${dreamerImports},
${tailwindNpmImports ? `\n${tailwindNpmImports},\n` : ""}${
    unocssNpmImports ? `${unocssNpmImports},\n` : ""
  }
${otherImports}
  },
  "nodeModulesDir": "auto",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "${jsxImportSource}"
  }
}
`;
}

/**
 * 单应用 main.ts 内容（对齐 examples 下 basic 示例，无 socket-io）
 * 使用 src 目录时，config 放在 src/config；否则放在项目根 config
 */
function getMainTsSingle(opts: InitOptions): string {
  const assetsRoot = opts.useSrc ? "src/assets" : "assets";
  const cssEntry = opts.style === "tailwind"
    ? (opts.useSrc ? "src/assets/tailwind.css" : "assets/tailwind.css")
    : opts.useSrc
    ? "src/assets/uno.css"
    : "assets/uno.css";
  const contentGlob = opts.useSrc ? "./src/**/*.{ts,tsx}" : "./**/*.{ts,tsx}";
  const useUno = opts.style === "unocss";
  const useTailwind = opts.style === "tailwind";
  const hasStyleAssets = useUno || useTailwind;

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
  output: "dist/client/assets",
  cssEntry: "${cssEntry}",
  content: ["${contentGlob}"],
}));`
    : useTailwind
    ? `
app.registerPlugin(tailwindPlugin({
  output: "dist/client/assets",
  cssEntry: "${cssEntry}",
  assetsPath: "/assets",
}));`
    : "";
  const staticPluginBlock = hasStyleAssets
    ? `
app.registerPlugin(staticPlugin({
  statics: [
    { root: "${assetsRoot}", prefix: "/assets" },
    { root: "dist/client/assets", prefix: "/assets" },
  ],
}));`
    : "";

  return `/**
 * 服务端入口
 * ${opts.engine === "preact" ? "Preact" : "React"} + @dreamer/dweb
 * 配置由框架自动加载，无需手动导入合并
 */

import { App } from "@dreamer/dweb";
${stylePluginImport}
${staticImport}

const app = new App();
${stylePluginBlock}
${staticPluginBlock}

app.start();
`;
}

/** 多应用下单个应用的 main.ts：框架自动从入口路径推断 config 目录，加载 common/config + 应用 config 并合并 */
function getMainTsMulti(
  opts: InitOptions,
  appName: string,
): string {
  const prefix = opts.useSrc ? "src/" : "";
  const assetsRoot = `${prefix}${appName}/assets`;
  const distAssetsRoot = `dist/${appName}/client/assets`;
  const cssEntry = opts.style === "tailwind"
    ? `${prefix}${appName}/assets/tailwind.css`
    : `${prefix}${appName}/assets/uno.css`;
  const useUno = opts.style === "unocss";
  const useTailwind = opts.style === "tailwind";
  const hasStyleAssets = useUno || useTailwind;

  const stylePluginImport = useUno
    ? `import { unocssPlugin } from "@dreamer/plugins/unocss";`
    : useTailwind
    ? `import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";`
    : "";
  const stylePluginBlock = useUno
    ? `
app.registerPlugin(unocssPlugin({
  output: "${distAssetsRoot}",
  cssEntry: "${cssEntry}",
  content: ["./${prefix}${appName}/**/*.{ts,tsx}"],
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

  const staticImportMulti = hasStyleAssets
    ? `import { staticPlugin } from "@dreamer/plugins/static";`
    : "";

  const configPathHint = opts.useSrc
    ? `common/config + src/${appName}/config`
    : `common/config + ${appName}/config`;
  return `/**
 * ${appName} 应用入口
 * 配置由框架自动加载 ${configPathHint} 并合并
 */

import { App } from "@dreamer/dweb";
${stylePluginImport}
${staticImportMulti}

const app = new App();
${stylePluginBlock}
${staticPluginBlock}

app.start();
`;
}

/**
 * 应用配置 main.ts（框架自动加载并合并，多应用时 common/config 先加载，本应用配置可覆盖）
 * @param opts 选项
 * @param appName 多应用时传入应用名
 * @param port 多应用时传入该应用端口（单应用不传则 3000）
 */
function getConfigMainTs(
  opts: InitOptions,
  appName?: string,
  port?: number,
): string {
  const prefix = opts.useSrc ? "src/" : "";
  const routesDir = appName
    ? `./${prefix}${appName}/routes`
    : opts.useSrc
    ? "./src/routes"
    : "./routes";
  /** 无 src 时监听根目录 ./，有 src 时监听 ./src */
  const watchPaths = opts.useSrc ? ["./src"] : ["./"];
  const configName = appName ?? opts.projectName;
  const serverPort = port ?? 3000;
  const renderMode = opts.renderMode ?? "hybrid";

  // 多应用：仅写应用级覆盖，version 等由 common/config 自动合并
  if (appName) {
    return `/**
 * ${appName} 应用配置
 * version 等公共字段由 common/config 自动合并，无需手动导入
 */
import type { AppConfig } from "@dreamer/dweb";

export default {
  name: "${configName}",
  server: {
    port: ${serverPort},
    host: "127.0.0.1",
  },
  router: {
    routesDir: "${routesDir}",
  },
  render: {
    engine: "${opts.engine}",
    mode: "${renderMode}",
  },
  logger: {
    level: "info",
    format: "text",
    output: {
      auto: true,
      console: true,
      file: {
        path: "runtime/logs/${appName}.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
  },
  build: {
    server: {
      useNativeCompile: false,
    },
  },
} satisfies AppConfig;
`;
  }

  // 单应用：完整配置
  return `/**
 * 应用配置
 * 框架会自动加载本文件
 */
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "${configName}",
  version: "1.0.0",
  /** 框架语言（根据用户环境自动检测，可改为 "en-US"） */
  language: "${getDefaultLanguage()}",
  server: {
    port: ${serverPort},
    host: "127.0.0.1",
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ${JSON.stringify(watchPaths)},
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },
  render: {
    engine: "${opts.engine}",
    mode: "${renderMode}",
  },
  router: {
    routesDir: "${routesDir}",
  },
  logger: {
    level: "info",
    format: "text",
    output: {
      auto: true,
      console: true,
      file: {
        path: "runtime/logs/app.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
  },
  build: {
    server: {
      useNativeCompile: false,
    },
  },
  // 数据库配置（按需取消注释）
  // database: {
  //   default: {
  //     type: "sqlite",
  //     connection: { filename: "./data.db" },
  //   },
  // },
};

export default config;
`;
}

/** 开发环境配置 main.dev.ts（只需写增量，框架会自动与 main.ts 深度合并） */
function getConfigMainDevTs(): string {
  return `/**
 * 开发环境配置
 * 只需写增量覆盖，框架会自动与 main.ts 深度合并
 */
export default {
  server: {
    host: "127.0.0.1",
  },
  logger: {
    level: "debug",
    format: "text",
  },
  hotReload: true,
};
`;
}

function getAppTsx(opts: InitOptions): string {
  const titleName = opts.projectName;
  const isPreact = opts.engine === "preact";
  const childrenType = isPreact
    ? 'import type { ComponentChildren } from "preact";\n\ninterface AppProps {\n  children: ComponentChildren;'
    : 'import type { ReactNode } from "react";\n\ninterface AppProps {\n  children: ReactNode;';
  return `/**
 * 应用根组件
 */

${childrenType}
  title?: string;
  description?: string;
}

export default function App({
  children,
  title = "${titleName}",
  description = "Built with @dreamer/dweb",
}: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={description} />
        <title>{title}</title>
      </head>
      <body className="bg-gray-100 text-gray-900 antialiased">
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
`;
}

function getLayoutTsx(opts: InitOptions, appName?: string): string {
  const isPreact = opts.engine === "preact";
  const appDisplayName = appName ?? opts.projectName;
  // UnoCSS/无样式 无 primary 主题色，用 indigo；Tailwind v4 用 @theme 定义的 primary
  const accentClass = opts.style === "tailwind"
    ? "text-primary-600 hover:text-primary-700"
    : "text-indigo-600 hover:text-indigo-700";
  const linkClass = opts.style === "tailwind"
    ? "text-gray-600 hover:text-primary-600 transition-colors"
    : "text-gray-600 hover:text-indigo-600 transition-colors";
  const styleComment = opts.style === "unocss"
    ? "UnoCSS"
    : opts.style === "tailwind"
    ? "Tailwind CSS v4"
    : "通用样式";
  const importAndProps = isPreact
    ? `import type { ComponentChildren } from "preact";

interface LayoutProps {
  children: ComponentChildren;
}`
    : `import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}`;
  return `/**
 * 布局组件
 * 页头、页脚和内容区域（使用 ${styleComment}）
 */

${importAndProps}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16">
            <a
              href="/"
              className="text-xl font-bold ${accentClass}"
            >
              ${appDisplayName}
            </a>
            <ul className="flex items-center gap-6 list-none m-0 p-0">
              <li>
                <a
                  href="/"
                  className="${linkClass}"
                >
                  首页
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="${linkClass}"
                >
                  关于
                </a>
              </li>
              <li>
                <a
                  href="/user/1"
                  className="${linkClass}"
                >
                  用户示例
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 Built with @dreamer/dweb
          </p>
        </div>
      </footer>
    </div>
  );
}
`;
}

function getIndexTsx(opts: InitOptions): string {
  const engineName = opts.engine === "preact" ? "Preact" : "React";
  // UnoCSS/无样式 使用 bg-gradient-to-br；Tailwind v4 使用 bg-linear-to-br
  const heroGradient = opts.style === "tailwind"
    ? "bg-linear-to-br from-[#667eea] to-[#764ba2]"
    : "bg-gradient-to-br from-[#667eea] to-[#764ba2]";
  return `/**
 * 首页
 * 路由: /
 */

export default function Home() {
  return (
    <div className="py-5">
      <section className="mb-10 rounded-xl ${heroGradient} px-5 py-15 text-center text-white">
        <h1 className="mb-4 text-4xl">欢迎使用 Dweb 框架</h1>
        <p className="text-xl text-white/90">
          这是一个使用 @dreamer/dweb 框架构建的 ${engineName} 示例项目
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-8 text-center">特性</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">文件路由</h3>
            <p>基于文件系统的路由，无需手动配置</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">SSR 渲染</h3>
            <p>服务端渲染，提供最佳首屏性能</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">TypeScript</h3>
            <p>完整的 TypeScript 支持</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">${engineName}</h3>
            <p>轻量级 React 替代方案</p>
          </div>
        </div>
      </section>
    </div>
  );
}
`;
}

function getAboutTsx(opts: InitOptions): string {
  const engineName = opts.engine === "preact" ? "Preact" : "React";
  return `/**
 * 关于页面
 * 路由: /about
 */

export default function About() {
  return (
    <div className="py-5">
      <h1 className="mb-8 text-3xl font-bold">关于我们</h1>

      <section className="rounded-lg bg-white p-8 shadow-md">
        <p className="mb-6">
          这是一个使用 <strong>@dreamer/dweb</strong> 框架和{" "}
          <strong>${engineName}</strong> 构建的示例项目。
        </p>

        <h2 className="mb-4 mt-6 text-xl font-semibold text-indigo-600">技术栈</h2>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>@dreamer/dweb</strong> - 全栈 Web 框架
          </li>
          <li>
            <strong>${engineName}</strong> - 轻量级 React 替代方案
          </li>
          <li>
            <strong>Deno</strong> - 现代 JavaScript/TypeScript 运行时
          </li>
          <li>
            <strong>TypeScript</strong> - 类型安全的 JavaScript
          </li>
        </ul>
      </section>
    </div>
  );
}
`;
}

/** 用户详情页 user/[id].tsx */
function getUserByIdTsx(opts: InitOptions): string {
  // UnoCSS/无样式 使用 bg-gradient-to-br；Tailwind v4 使用 bg-linear-to-br
  const avatarGradient = opts.style === "tailwind"
    ? "bg-linear-to-br from-indigo-500 to-purple-600"
    : "bg-gradient-to-br from-indigo-500 to-purple-600";
  return `/**
 * 用户详情页面
 * 动态路由: /user/:id
 */

/** 用户页面属性 */
interface UserProps {
  /** 路由参数 */
  params: {
    id: string;
  };
}

/** 模拟用户数据 */
const users: Record<string, { name: string; email: string; role: string }> = {
  "1": { name: "张三", email: "zhangsan@example.com", role: "管理员" },
  "2": { name: "李四", email: "lisi@example.com", role: "用户" },
  "3": { name: "王五", email: "wangwu@example.com", role: "访客" },
};

/**
 * 用户详情页面
 */
export default function User({ params }: UserProps) {
  const user = users[params.id];

  if (!user) {
    return (
      <div className="py-16 px-5 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-500">用户不存在</h1>
        <p className="mb-4">用户 ID: {params.id} 不存在</p>
        <a
          href="/"
          className="mt-5 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-white no-underline hover:bg-blue-700"
        >
          返回首页
        </a>
      </div>
    );
  }

  return (
    <div className="py-5">
      <h1 className="mb-8 text-3xl font-bold">用户详情</h1>

      <div className="flex items-center gap-6 rounded-xl bg-white p-8 shadow-md">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${avatarGradient} text-3xl font-bold text-white">
          {user.name.charAt(0)}
        </div>
        <div>
          <h2 className="mb-2 text-2xl font-semibold">{user.name}</h2>
          <p className="mb-2.5 text-gray-600">{user.email}</p>
          <span className="inline-block rounded-full bg-indigo-500 px-3 py-1 text-sm text-white">
            {user.role}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <a
          href="/user/1"
          className="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          用户 1
        </a>
        <a
          href="/user/2"
          className="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          用户 2
        </a>
        <a
          href="/user/3"
          className="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          用户 3
        </a>
      </div>
    </div>
  );
}
`;
}

/**
 * Tailwind CSS v4 入口模板
 * @source 指定扫描路径，供 Tailwind 生成工具类
 */
function getTailwindCss(): string {
  return `/**
 * TailwindCSS v4 入口
 * 指定内容扫描路径（生成 class 时使用）
 */
@source "../**/*.{ts,tsx}";

@import "tailwindcss";

@theme {
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;
}
`;
}

/**
 * UnoCSS 入口模板
 * 插件会扫描项目中的 class 生成工具类，并与此文件内容合并输出。
 * 本文件可只保留注释：工具类由 main 里注册的 unocssPlugin 按 content 扫描生成，不依赖此处写规则。
 * 需要时可在此添加自定义 CSS 或 :root 变量。
 */
function getUnoCss(): string {
  return `/**
 * UnoCSS 入口 / 自定义样式
 * 在组件里写 class 即可，unocssPlugin 会扫描并生成工具类，与此处内容合并输出。
 */

/* 基础 reset：移除浏览器默认 margin，消除底部白边 */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; min-height: 100%; }

/* 可选：自定义层，例如 :root { --color-primary: #333; } */
`;
}

/**
 * Dockerfile 模板
 * 基于 Deno 官方镜像，安装 curl 等基础工具用于健康检测
 */
function getDockerfile(): string {
  return `# ============================================
# 基础阶段：安装通用工具（所有服务都需要）
# ============================================
FROM denoland/deno:latest AS base

# 切换到 root 以执行 apt-get（Deno 镜像默认非 root 用户）
USER root

# 安装通用工具：curl 用于健康检测，coreutils 用于 tee
RUN apt-get update && \\
    apt-get install -y --no-install-recommends curl coreutils ca-certificates && \\
    rm -rf /var/lib/apt/lists/*

# 设置工作目录（compose 通过 volumes 挂载项目目录）
# Deno 缓存：首次启动前可在宿主机执行 deno cache 预填，或挂载 runtime/deno-cache
WORKDIR /app
`;
}

/**
 * docker-compose.yml 模板
 * 单应用：一个服务，端口 3000
 * 多应用：按 appNames 生成多个服务，端口 3000、3001、3002...
 */
function getDockerComposeYml(opts: InitOptions): string {
  const isMulti = opts.appMode === "multi" && (opts.appNames?.length ?? 0) > 0;
  const projectName = opts.projectName;

  if (isMulti && opts.appNames && opts.appNames.length > 0) {
    // 多应用：每个应用一个服务
    const services = opts.appNames
      .map((app, i) => {
        const port = 3000 + i;
        const containerName = `${projectName}-${app}`;
        return `  # ${app} 应用（端口 ${port}）
  ${app}:
    build:
      context: .
      dockerfile: Dockerfile
      target: base
    container_name: ${containerName}
    restart: unless-stopped
    stop_grace_period: 5s
    user: '0:0'
    ports:
      - '${port}:${port}'
    command: ['deno', 'run', '-A', 'dist/${app}/server.js']
    environment:
      - DENO_ENV=production
    volumes:
      - .:/app
      - \${DENO_CACHE_DIR:-./runtime/deno-cache}:/deno-dir
    healthcheck:
      test:
        [
          'CMD-SHELL',
          "curl -f -s -o /dev/null -w '%{http_code}' http://localhost:${port}/ | grep -q '^2' || exit 1"
        ]
      interval: 10s
      timeout: 1s
      retries: 3
      start_period: 5s
    logging:
      driver: 'local'
      options:
        max-size: '10m'
        max-file: '3'
        compress: 'true'`;
      })
      .join("\n\n");

    return `# docker-compose.yml
# 多应用模式：每个应用独立服务
# 使用前请先执行 deno task build:<app> 构建各应用
# 首次启动可挂载 Deno 缓存加速：deno cache 后挂载 runtime/deno-cache

services:
${services}

networks:
  default:
    driver: bridge
`;
  }

  // 单应用：一个服务，服务名使用项目名称
  return `# docker-compose.yml
# 单应用模式
# 使用前请先执行 deno task build 构建
# 首次启动可挂载 Deno 缓存加速：deno cache 后挂载 runtime/deno-cache

services:
  ${projectName}:
    build:
      context: .
      dockerfile: Dockerfile
      target: base
    container_name: ${projectName}-app
    restart: unless-stopped
    stop_grace_period: 5s
    user: '0:0'
    ports:
      - '3000:3000'
    command: ['deno', 'run', '-A', 'dist/server.js']
    environment:
      - DENO_ENV=production
    volumes:
      - .:/app
      - \${DENO_CACHE_DIR:-./runtime/deno-cache}:/deno-dir
    healthcheck:
      test:
        [
          'CMD-SHELL',
          "curl -f -s -o /dev/null -w '%{http_code}' http://localhost:3000/ | grep -q '^2' || exit 1"
        ]
      interval: 10s
      timeout: 1s
      retries: 3
      start_period: 5s
    logging:
      driver: 'local'
      options:
        max-size: '10m'
        max-file: '3'
        compress: 'true'

networks:
  default:
    driver: bridge
`;
}

function getGitignore(): string {
  return `# Deno
.deno/
deno.lock

# 依赖
node_modules

# 构建
dist/
build/

# dweb 自动生成（每次构建/启动会重新生成）
_client.dep.tsx

# Docker 缓存（deno cache 预填目录）
runtime/

# 环境
.env
.env.local

# IDE
.idea
.cursor

# 系统
.DS_Store
`;
}

/**
 * 生成 .vscode/settings.json 内容
 * 用户需 Bun 相关配置时可自行添加
 */
function getVscodeSettingsJson(): string {
  return `{
  // ==================== Deno 配置 ====================
  "deno.enable": true,
  "deno.lint": true,
  // ==================== 格式化配置 ====================
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "denoland.vscode-deno",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  },
  "[javascript]": {
    "editor.defaultFormatter": "denoland.vscode-deno",
    "editor.formatOnSave": true
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "denoland.vscode-deno",
    "editor.formatOnSave": true
  },
  "[json]": {
    "editor.defaultFormatter": "vscode.json-language-features",
    "editor.formatOnSave": true
  },
  "[jsonc]": {
    "editor.defaultFormatter": "vscode.json-language-features",
    "editor.formatOnSave": true
  },
  // ==================== 编辑器基础配置 ====================
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,
  "editor.trimAutoWhitespace": true,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.trimFinalNewlines": true,
  "editor.rulers": [120],
  "editor.wordWrap": "off",
  "editor.formatOnPaste": true,
  "editor.formatOnType": false,
  "editor.suggestSelection": "first",
  "editor.snippetSuggestions": "top",
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": false,
  "editor.minimap.enabled": true,
  // ==================== CSS / Tailwind 配置 ====================
  "css.lint.unknownAtRules": "ignore",
  // ==================== 文件关联 ====================
  "files.associations": {
    "*.tsx": "typescriptreact",
    "*.ts": "typescript"
  },
  // ==================== 文件排除 ====================
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/.deno": true
  },
  // ==================== 搜索排除 ====================
  "search.exclude": {
    "**/node_modules": true,
    "**/.deno": true,
    "**/dist": true,
    "**/runtime": true
  },
  // ==================== i18n-ally 配置 ====================
  "i18n-ally.localesPaths": ["locales"],
  "i18n-ally.keystyle": "nested",
  "i18n-ally.sortKeys": true,
  "i18n-ally.namespace": true,
  "i18n-ally.enabledParsers": ["json"],
  "i18n-ally.sourceLanguage": "zh-CN",
  "i18n-ally.displayLanguage": "zh-CN",
  "i18n-ally.translate.engines": ["deepl", "google"],
  "i18n-ally.extract.keygenStyle": "PascalCase",
  "i18n-ally.enabledFrameworks": ["react", "i18next"],
  "i18n-ally.regex.key": ".*?",
  "i18n-ally.extract.autoDetect": true
}
`;
}

/** common 目录下 config/main.ts：框架会先加载此处再合并应用 config，default 导出需为 AppConfig 兼容形状 */
function getCommonConfigMainTs(opts: InitOptions): string {
  const appNames = opts.appNames ?? [];
  if (appNames.length === 0) {
    return `/**
 * 公共配置入口（单应用时也可用）
 * 框架自动加载并与应用 config 合并，此处为低优先级
 */

export const commonConfig = {
  appName: "${opts.projectName}",
  version: "1.0.0",
};

export default {
  name: commonConfig.appName,
  version: commonConfig.version,
  /** 框架语言（根据用户环境自动检测） */
  language: "${getDefaultLanguage()}",
};
`;
  }
  return `/**
 * 公共配置
 * 前后端共享的配置，框架会自动与各应用配置深度合并
 */

/** 公共配置（供其他模块直接引用，如需要 version 时） */
export const commonConfig = {
  appName: "${opts.projectName}",
  version: "1.0.0",
};

/** 默认导出，框架会自动深度合并到各应用配置 */
export default {
  ...commonConfig,
  // 数据库配置（按需取消注释）
  // database: {
  //   default: {
  //     type: "sqlite",
  //     connection: { filename: "./data.db" },
  //   },
  // },
};
`;
}

/** common 目录下 config/main.dev.ts：公共开发环境配置，空配置占位 */
function getCommonConfigMainDevTs(): string {
  return `/**
 * 公共开发环境配置
 * 只需写增量，框架会自动与 main.ts 深度合并
 */
export default {};
`;
}

/** config/main.prod.ts：生产环境配置，空配置占位（common 与各应用共用此模板） */
function getConfigMainProdTs(): string {
  return `/**
 * 生产环境配置
 * 只需写增量，框架会自动与 main.ts 深度合并
 */
export default {};
`;
}

/** common 目录下 utils/mod.ts：公共工具占位 */
function getCommonUtilsModTs(): string {
  return `/**
 * 公共工具
 * 各应用可从此处引用，例如：import { noop } from "@common/utils/mod.ts";
 */

export function noop(): void {}
`;
}

/** common 目录下 model、service、hook 占位（空模块或极简导出，便于后续扩展） */
function getCommonSubdirModTs(moduleName: string): string {
  return `/**
 * common/${moduleName}
 * 各应用共享的 ${moduleName} 层，按需在此添加并导出。
 */

export {};
`;
}

/**
 * 根据选项生成项目文件
 */
export async function generate(opts: InitOptions): Promise<void> {
  const { targetDir, useSrc, style, exampleLevel, appMode, appNames } = opts;
  const prefix = useSrc ? "src/" : "";
  const isMulti = appMode === "multi" && appNames != null &&
    appNames.length > 0;

  await ensureDir(targetDir);

  if (isMulti && appNames) {
    // ---------- 多应用：common 目录（config, model, service, hook, utils）----------
    const commonBase = join(targetDir, prefix, "common");
    await ensureDir(join(commonBase, "config"));
    await ensureDir(join(commonBase, "model"));
    await ensureDir(join(commonBase, "service"));
    await ensureDir(join(commonBase, "hook"));
    await ensureDir(join(commonBase, "utils"));
    await writeTextFile(
      join(commonBase, "config", "main.ts"),
      getCommonConfigMainTs(opts),
    );
    await writeTextFile(
      join(commonBase, "config", "main.dev.ts"),
      getCommonConfigMainDevTs(),
    );
    await writeTextFile(
      join(commonBase, "config", "main.prod.ts"),
      getConfigMainProdTs(),
    );
    await writeTextFile(
      join(commonBase, "model", "mod.ts"),
      getCommonSubdirModTs("model"),
    );
    await writeTextFile(
      join(commonBase, "service", "mod.ts"),
      getCommonSubdirModTs("service"),
    );
    await writeTextFile(
      join(commonBase, "hook", "mod.ts"),
      getCommonSubdirModTs("hook"),
    );
    await writeTextFile(
      join(commonBase, "utils", "mod.ts"),
      getCommonUtilsModTs(),
    );

    // ---------- 多应用：各应用目录（main.ts、config、routes、components、assets）----------
    for (const appName of appNames) {
      const appBase = join(targetDir, prefix, appName);
      await ensureDir(join(appBase, "config"));
      await ensureDir(join(appBase, "routes"));
      await ensureDir(join(appBase, "components"));
      if (style !== "none") {
        await ensureDir(join(appBase, "assets"));
      }

      await writeTextFile(
        join(appBase, "main.ts"),
        getMainTsMulti(opts, appName),
      );
      await writeTextFile(
        join(appBase, "config", "main.ts"),
        getConfigMainTs(opts, appName, 3000 + appNames.indexOf(appName)),
      );
      await writeTextFile(
        join(appBase, "config", "main.dev.ts"),
        getConfigMainDevTs(),
      );
      await writeTextFile(
        join(appBase, "config", "main.prod.ts"),
        getConfigMainProdTs(),
      );
      await writeTextFile(
        join(appBase, "routes", "_app.tsx"),
        getAppTsx(opts),
      );
      await writeTextFile(
        join(appBase, "routes", "_layout.tsx"),
        getLayoutTsx(opts, appName),
      );
      await writeTextFile(
        join(appBase, "routes", "index.tsx"),
        getIndexTsx(opts),
      );
      if (exampleLevel === "with-about") {
        await writeTextFile(
          join(appBase, "routes", "about.tsx"),
          getAboutTsx(opts),
        );
        await ensureDir(join(appBase, "routes", "user"));
        await writeTextFile(
          join(appBase, "routes", "user", "[id].tsx"),
          getUserByIdTsx(opts),
        );
      }
      if (style === "tailwind") {
        await writeTextFile(
          join(appBase, "assets", "tailwind.css"),
          getTailwindCss(),
        );
      }
      if (style === "unocss") {
        await writeTextFile(
          join(appBase, "assets", "uno.css"),
          getUnoCss(),
        );
      }
    }
  } else {
    // ---------- 单应用 ----------
    // 使用 src 时 config 放在 src/config，否则放在项目根 config
    const configBase = useSrc
      ? join(targetDir, "src", "config")
      : join(targetDir, "config");
    await ensureDir(configBase);
    await ensureDir(join(targetDir, prefix, "routes"));
    await ensureDir(join(targetDir, prefix, "components"));
    if (style !== "none") {
      await ensureDir(join(targetDir, prefix, "assets"));
    }

    await writeTextFile(
      join(targetDir, prefix, "main.ts"),
      getMainTsSingle(opts),
    );
    await writeTextFile(
      join(configBase, "main.ts"),
      getConfigMainTs(opts),
    );
    await writeTextFile(
      join(configBase, "main.dev.ts"),
      getConfigMainDevTs(),
    );
    await writeTextFile(
      join(configBase, "main.prod.ts"),
      getConfigMainProdTs(),
    );
    await writeTextFile(
      join(targetDir, prefix, "routes", "_app.tsx"),
      getAppTsx(opts),
    );
    await writeTextFile(
      join(targetDir, prefix, "routes", "_layout.tsx"),
      getLayoutTsx(opts),
    );
    await writeTextFile(
      join(targetDir, prefix, "routes", "index.tsx"),
      getIndexTsx(opts),
    );
    if (exampleLevel === "with-about") {
      await writeTextFile(
        join(targetDir, prefix, "routes", "about.tsx"),
        getAboutTsx(opts),
      );
      await ensureDir(join(targetDir, prefix, "routes", "user"));
      await writeTextFile(
        join(targetDir, prefix, "routes", "user", "[id].tsx"),
        getUserByIdTsx(opts),
      );
    }
    if (style === "tailwind") {
      await writeTextFile(
        join(targetDir, prefix, "assets", "tailwind.css"),
        getTailwindCss(),
      );
    }
    if (style === "unocss") {
      await writeTextFile(
        join(targetDir, prefix, "assets", "uno.css"),
        getUnoCss(),
      );
    }
  }

  // 根 deno.json、.gitignore、.vscode/settings.json（单应用与多应用共用）
  // useBeta=false：仅 dweb 从 JSR 获取；render/router/plugins 用 dweb deno.json（未发正式版）
  // useBeta=true：全部从 JSR 获取 beta 最新版
  const useBeta = opts.useBeta ?? false;
  startSpinner($t("init.fetchingVersions"));
  let dwebConfig: DwebDenoConfig | null = null;
  let jsrVersions: JsrVersions;
  try {
    dwebConfig = await loadDwebDenoJson();
    jsrVersions = await fetchDreamerVersions(useBeta, dwebConfig);
    succeedSpinner($t("init.fetched"));
  } catch {
    failSpinner($t("init.fetchFailed"));
    jsrVersions = {
      dweb: dwebConfig?.version ?? FALLBACK_DWEB_VERSION,
      render: "1.0.0",
      router: "1.0.0",
      plugins: "1.0.0",
    };
  }
  await writeTextFile(
    join(targetDir, "deno.json"),
    getDenoJson(opts, jsrVersions),
  );
  await writeTextFile(join(targetDir, ".gitignore"), getGitignore());

  // 创建 Dockerfile 和 docker-compose.yml（单应用/多应用根据 opts 生成）
  await writeTextFile(join(targetDir, "Dockerfile"), getDockerfile());
  await writeTextFile(
    join(targetDir, "docker-compose.yml"),
    getDockerComposeYml(opts),
  );

  // 创建 runtime 目录：deno-cache 用于 Docker 挂载，logs 用于 logger 文件输出
  await ensureDir(join(targetDir, "runtime", "deno-cache"));
  await ensureDir(join(targetDir, "runtime", "logs"));

  // 创建 .vscode/settings.json，便于 IDE 开箱即用
  await ensureDir(join(targetDir, ".vscode"));
  await writeTextFile(
    join(targetDir, ".vscode", "settings.json"),
    getVscodeSettingsJson(),
  );
}

/** init main 的选项（来自 CLI --beta 等） */
export interface InitMainOptions {
  /** 是否使用 beta 最新版 */
  beta?: boolean;
}

/**
 * 主入口
 *
 * @param argv 可选，由 CLI 传入的子命令参数（如 ["my-app"]），会传给 collectOptions 作为项目名称
 * @param options 可选，CLI 选项（如 { beta: true } 来自 --beta）
 */
export async function main(
  argv?: string[],
  options?: InitMainOptions,
): Promise<void> {
  const opts = await collectOptions(argv, options?.beta);

  const targetExists = await exists(opts.targetDir);
  if (targetExists) {
    // 简单检查：项目目录已存在时确认是否继续写入
    const go = await confirm(
      $t("init.dirExistsConfirm", { path: opts.targetDir }),
      false,
    );
    if (!go) {
      info($t("init.cancelled"));
      return;
    }
  }

  info($t("init.generatingProject"));
  await generate(opts);

  success($t("init.projectCreated"));
  info($t("init.nextSteps"));
  const isMulti = opts.appMode === "multi" && (opts.appNames?.length ?? 0) > 0;
  if (opts.targetDir !== cwd()) {
    info($t("init.cdDir", { dir: basename(opts.targetDir) }));
  }
  if (isMulti && opts.appNames?.length) {
    for (const app of opts.appNames) {
      info($t("init.runDevApp", { app }));
    }
  } else {
    info($t("init.runDev"));
  }
  console.log("");
}

// 仅作为脚本直接运行时执行；被 CLI 等 import 时不自动执行，由调用方调用 main(argv)
if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    exit(1);
  });
}
