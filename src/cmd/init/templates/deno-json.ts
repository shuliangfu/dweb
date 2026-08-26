/**
 * init 生成的 deno.json 模板
 */

import {
  DREAMER_TEST_VERSION,
  POSTCSS_VERSION,
  PREACT_VERSION,
  REACT_DOM_VERSION,
  REACT_VERSION,
  SCHEDULER_VERSION,
  TAILWIND_VERSION,
  UNOCSS_CORE_VERSION,
} from "../constants.ts";
import {
  getAppKind,
  getJsxImportSource,
  hasWebApp,
  resolveApps,
} from "../helpers.ts";
import type { InitOptions, JsrVersions } from "../types.ts";

/**
 * 根据 opts 与 JSR 版本生成项目根 deno.json 内容。
 * npm: 依赖使用 `package@^x.y.z`，与仓库根 deno.json 写法一致。
 */
export function getDenoJson(
  opts: InitOptions,
  jsrVersions: JsrVersions,
): string {
  const prefix = opts.useSrc ? "src/" : "";
  const needUiEngine = hasWebApp(opts);
  const useUno = needUiEngine && opts.style === "unocss";
  const useTailwind = needUiEngine && opts.style === "tailwind";
  const hasStyleAssets = useUno || useTailwind;
  const dwebVersion = jsrVersions.dweb;
  const pluginsVersion = jsrVersions.plugins;
  const renderSpec = `jsr:@dreamer/render@^${jsrVersions.render}`;
  const routerSpec = `jsr:@dreamer/router@^${jsrVersions.router}`;

  const viewVersion = jsrVersions.view;
  const viewSpec = `jsr:@dreamer/view@^${viewVersion}`;
  const dreamerImports = [
    `    "@dreamer/dweb": "jsr:@dreamer/dweb@^${dwebVersion}"`,
    `    "@dreamer/render": "${renderSpec}"`,
    `    "@dreamer/router": "${routerSpec}"`,
    `    "@dreamer/test": "jsr:@dreamer/test@^${DREAMER_TEST_VERSION}"`,
    ...(hasStyleAssets
      ? [`    "@dreamer/plugins": "jsr:@dreamer/plugins@^${pluginsVersion}"`]
      : []),
    ...(needUiEngine && opts.engine === "view"
      ? [`    "@dreamer/view": "${viewSpec}"`]
      : []),
  ].join(",\n");

  const tailwindNpmImports = useTailwind
    ? `    "postcss": "npm:postcss@^${POSTCSS_VERSION}",
    "tailwindcss": "npm:tailwindcss@^${TAILWIND_VERSION}",
    "@tailwindcss/postcss": "npm:@tailwindcss/postcss@^${TAILWIND_VERSION}"`
    : "";
  const unocssNpmImports = useUno
    ? `    "@unocss/core": "npm:@unocss/core@^${UNOCSS_CORE_VERSION}",
    "@unocss/preset-wind3": "npm:@unocss/preset-wind3@^${UNOCSS_CORE_VERSION}",
    "@unocss/preset-icons": "npm:@unocss/preset-icons@^${UNOCSS_CORE_VERSION}"`
    : "";

  const engineImports = !needUiEngine
    ? ""
    : opts.engine === "preact"
    ? `    "preact": "npm:preact@^${PREACT_VERSION}"`
    : opts.engine === "view"
    ? ""
    : `    "react": "npm:react@^${REACT_VERSION}",
    "react-dom": "npm:react-dom@^${REACT_DOM_VERSION}",
    "scheduler": "npm:scheduler@^${SCHEDULER_VERSION}"`;

  const npmImports = [tailwindNpmImports, unocssNpmImports, engineImports]
    .filter(Boolean)
    .join(",\n");
  const importsNpmPart = npmImports ? `,\n\n${npmImports}` : "";
  const jsxImportSource = needUiEngine
    ? getJsxImportSource(opts.engine)
    : "preact";
  /** View 引擎 TSX 类型由 @dreamer/view 与 jsxImportSource 提供，无需项目根 jsx.d.ts 或 compilerOptions.types */

  const apps = resolveApps(opts);
  const isMulti = opts.appMode === "multi" && apps.length > 0 &&
    (opts.appNames != null || opts.apps != null);
  const httpApps = apps.filter((a) => a.kind === "web" || a.kind === "api");
  const consoleApps = apps.filter((a) => a.kind === "console");
  const commonPath = opts.useSrc ? "./src/common/" : "./common/";
  // 与 `App` 中 `RUNTIME_ENV` 约定一致：`--dev` / `--build` / `--start` 显式传入
  // console 不生成 HTTP task；可选留下注释性 run 提示 task
  const httpTasks = isMulti
    ? [
      httpApps
        .map(
          (app) =>
            `    "dev:${app.name}": "deno run -A ${prefix}${app.name}/main.ts --dev"`,
        )
        .join(",\n"),
      httpApps
        .map(
          (app) =>
            `    "build:${app.name}": "deno run -A ${prefix}${app.name}/main.ts --build"`,
        )
        .join(",\n"),
      httpApps
        .map(
          (app) =>
            `    "start:${app.name}": "deno run -A dist/${app.name}/server.js --start"`,
        )
        .join(",\n"),
    ].filter(Boolean).join(",\n\n")
    : getAppKind(opts) === "console"
    ? `    "run:hello": "echo Use: dweb-cli run hello/world"`
    : `    "dev": "deno run -A ${prefix}main.ts --dev",
    "build": "deno run -A ${prefix}main.ts --build",
    "start": "deno run -A dist/server.js --start"`;

  const consoleHintTasks = consoleApps.length > 0 && isMulti
    ? `    "run:hello": "echo Use: dweb-cli run hello/world -a console"`
    : "";

  const tasksBlock = [httpTasks, consoleHintTasks].filter(Boolean).join(
    ",\n\n",
  );

  const appDirPrefix = opts.useSrc ? "./src/" : "./";
  const dirAliasesBlock = isMulti
    ? [
      `    "@common/": "${commonPath}"`,
      ...apps.map((app) =>
        `    "@${app.name}/": "${appDirPrefix}${app.name}/"`
      ),
    ].join(",\n") + ",\n\n"
    : "";

  return `{
  "version": "1.0.0",
  "tasks": {
${tasksBlock}
  },
  "imports": {
${dirAliasesBlock}${dreamerImports}${importsNpmPart}
  },
  "nodeModulesDir": "auto",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "${jsxImportSource}"
  }
}
`;
}
