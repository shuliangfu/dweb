/**
 * init 生成的 deno.json 模板
 */

import {
  POSTCSS_VERSION,
  PREACT_VERSION,
  REACT_DOM_VERSION,
  REACT_VERSION,
  SCHEDULER_VERSION,
  TAILWIND_VERSION,
  UNOCSS_CORE_VERSION,
} from "../constants.ts";
import { getJsxImportSource } from "../helpers.ts";
import type { InitOptions, JsrVersions } from "../types.ts";

/**
 * 根据 opts 与 JSR 版本生成项目根 deno.json 内容
 */
export function getDenoJson(
  opts: InitOptions,
  jsrVersions: JsrVersions,
): string {
  const prefix = opts.useSrc ? "src/" : "";
  const useUno = opts.style === "unocss";
  const useTailwind = opts.style === "tailwind";
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
    ...(hasStyleAssets
      ? [`    "@dreamer/plugins": "jsr:@dreamer/plugins@^${pluginsVersion}"`]
      : []),
    ...(opts.engine === "view" ? [`    "@dreamer/view": "${viewSpec}"`] : []),
  ].join(",\n");

  const tailwindNpmImports = useTailwind
    ? `    "postcss": "npm:postcss@${POSTCSS_VERSION}",
    "tailwindcss": "npm:tailwindcss@${TAILWIND_VERSION}",
    "@tailwindcss/postcss": "npm:@tailwindcss/postcss@${TAILWIND_VERSION}"`
    : "";
  const unocssNpmImports = useUno
    ? `    "@unocss/core": "npm:@unocss/core@${UNOCSS_CORE_VERSION}",
    "@unocss/preset-wind3": "npm:@unocss/preset-wind3@${UNOCSS_CORE_VERSION}",
    "@unocss/preset-icons": "npm:@unocss/preset-icons@${UNOCSS_CORE_VERSION}"`
    : "";

  const engineImports = opts.engine === "preact"
    ? `    "preact": "npm:preact@${PREACT_VERSION}"`
    : opts.engine === "view"
    ? ""
    : `    "react": "npm:react@${REACT_VERSION}",
    "react-dom": "npm:react-dom@${REACT_DOM_VERSION}",
    "scheduler": "npm:scheduler@${SCHEDULER_VERSION}"`;

  const npmImports = [tailwindNpmImports, unocssNpmImports, engineImports]
    .filter(Boolean)
    .join(",\n");
  const importsNpmPart = npmImports ? `,\n\n${npmImports}` : "";
  const jsxImportSource = getJsxImportSource(opts.engine);
  /** view 引擎需在 compilerOptions 中声明 types 指向 jsx.d.ts，供 TSX 类型检查（使用 ./ 相对路径） */
  const compilerTypes = opts.engine === "view"
    ? ',\n    "types": ["./jsx.d.ts"]'
    : "";

  const isMulti = opts.appMode === "multi" && (opts.appNames?.length ?? 0) > 0;
  const commonPath = opts.useSrc ? "./src/common/" : "./common/";
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
        .map((app) => `    "start:${app}": "deno run -A dist/${app}/server.js"`)
        .join(",\n"),
    ].join(",\n\n")
    : `    "dev": "deno run -A ${prefix}main.ts",
    "build": "deno run -A ${prefix}main.ts --build",
    "start": "deno run -A dist/server.js"`;

  const appDirPrefix = opts.useSrc ? "./src/" : "./";
  const dirAliasesBlock = isMulti && opts.appNames
    ? [
      `    "@common/": "${commonPath}"`,
      ...opts.appNames.map((app) => `    "@${app}/": "${appDirPrefix}${app}/"`),
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
    "jsxImportSource": "${jsxImportSource}"${compilerTypes}
  }
}
`;
}
