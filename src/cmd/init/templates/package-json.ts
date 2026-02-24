/**
 * init 生成的 package.json 模板
 *
 * 与 deno.json 对应：version、scripts、dependencies 一致，
 * 便于 npm/bun install 与 npm/bun run dev | build | start。
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
import type { InitOptions, JsrVersions } from "../types.ts";

/**
 * 将项目名转为 npm 合法 package name（小写、空格/非法字符转连字符）
 */
function toNpmName(projectName: string): string {
  return projectName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "dweb-app";
}

/**
 * 根据 opts 与 jsrVersions 生成 dependencies 块（与 deno.json imports 对应）
 */
function getDependenciesBlock(opts: InitOptions, jsr: JsrVersions): string {
  const useUno = opts.style === "unocss";
  const useTailwind = opts.style === "tailwind";
  const hasStyleAssets = useUno || useTailwind;

  const dreamerDeps = [
    `    "@dreamer/dweb": "npm:@jsr/dreamer__dweb@^${jsr.dweb}"`,
    `    "@dreamer/render": "npm:@jsr/dreamer__render@^${jsr.render}"`,
    `    "@dreamer/router": "npm:@jsr/dreamer__router@^${jsr.router}"`,
    ...(hasStyleAssets
      ? [`    "@dreamer/plugins": "npm:@jsr/dreamer__plugins@^${jsr.plugins}"`]
      : []),
    ...(opts.engine === "view"
      ? [`    "@dreamer/view": "npm:@jsr/dreamer__view@^${jsr.view}"`]
      : []),
  ];

  const tailwindDeps = useTailwind
    ? [
      `    "postcss": "${POSTCSS_VERSION}"`,
      `    "tailwindcss": "${TAILWIND_VERSION}"`,
      `    "@tailwindcss/postcss": "${TAILWIND_VERSION}"`,
    ]
    : [];
  const unocssDeps = useUno
    ? [
      `    "@unocss/core": "${UNOCSS_CORE_VERSION}"`,
      `    "@unocss/preset-wind3": "${UNOCSS_CORE_VERSION}"`,
      `    "@unocss/preset-icons": "${UNOCSS_CORE_VERSION}"`,
    ]
    : [];
  const engineDeps = opts.engine === "preact"
    ? [`    "preact": "${PREACT_VERSION}"`]
    : opts.engine === "view"
    ? []
    : [
      `    "react": "${REACT_VERSION}"`,
      `    "react-dom": "${REACT_DOM_VERSION}"`,
      `    "scheduler": "${SCHEDULER_VERSION}"`,
    ];

  const all = [...dreamerDeps, ...tailwindDeps, ...unocssDeps, ...engineDeps];
  return all.join(",\n");
}

/**
 * 根据 opts 与 JSR 版本生成项目根 package.json 内容（与 deno.json 的 version、tasks、imports 对应）
 */
export function getPackageJson(
  opts: InitOptions,
  jsrVersions: JsrVersions,
): string {
  const prefix = opts.useSrc ? "src/" : "";
  const isMulti = opts.appMode === "multi" && (opts.appNames?.length ?? 0) > 0;
  const name = toNpmName(opts.projectName);

  const scriptsBlock = isMulti && opts.appNames
    ? [
      opts.appNames
        .map(
          (app) => `    "dev:${app}": "bun run ${prefix}${app}/main.ts"`,
        )
        .join(",\n"),
      opts.appNames
        .map(
          (app) =>
            `    "build:${app}": "bun run ${prefix}${app}/main.ts -- --build"`,
        )
        .join(",\n"),
      opts.appNames
        .map((app) => `    "start:${app}": "bun run dist/${app}/server.js"`)
        .join(",\n"),
    ].join(",\n\n")
    : `    "dev": "bun run ${prefix}main.ts",
    "build": "bun run ${prefix}main.ts -- --build",
    "start": "bun run dist/server.js"`;

  const dependenciesBlock = getDependenciesBlock(opts, jsrVersions);

  return `{
  "name": "${name}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
${scriptsBlock}
  },
  "dependencies": {
${dependenciesBlock}
  }
}
`;
}
