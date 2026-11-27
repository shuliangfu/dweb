/**
 * init 生成的 main.ts 模板（单应用与多应用共用 body，通过 getStyleContext 统一样式逻辑）
 */

import {
  $tr,
  getAppKind,
  getEngineDisplayName,
  getStyleContext,
} from "../helpers.ts";
import type { InitOptions } from "../types.ts";

/**
 * 生成 main.ts 内容（单应用不传 appName，多应用传 appName 以区分路径与注释）
 */
function buildMainTsBody(opts: InitOptions, appName?: string): string {
  const kind = getAppKind(opts, appName);
  const style = getStyleContext(opts, appName);
  const commentLine = appName != null
    ? ` * ${$tr("init.comments.appEntry", { appName })}\n * ${
      $tr("init.comments.configAutoLoadedFrom", {
        configPathHint: opts.useSrc
          ? `common/config + src/${appName}/config`
          : `common/config + ${appName}/config`,
      })
    }`
    : ` * ${$tr("init.comments.serverEntry")}\n * ${
      getEngineDisplayName(opts.engine)
    } + @dreamer/dweb\n * ${$tr("init.comments.configAutoLoaded")}`;

  if (kind === "console") {
    return `/**
${commentLine}
 * ${$tr("init.comments.consoleEntryHint")}
 *
 * Middleware order (outer → inner):
 * 1. console/middlewares/*.ts (filename sort)
 * 2. config.middlewares (main.ts + main.dev.ts / main.prod.ts + entry config)
 * 3. app.use() in this file
 * 4. routes/…/_middleware.ts (root → command directory)
 * 5. route module before → action → after
 */

import { App } from "@dreamer/dweb";

const app = new App({
  kind: "console",
  // plugins: [myPlugin],
  // middlewares: [myMiddleware],
});

// app.use(myMiddleware);
// await app.registerPlugin(myPlugin);

export default app;
`;
  }

  return `/**
${commentLine}
 */

import { App } from "@dreamer/dweb";
${style.stylePluginImport}
${style.staticImport}

const app = new App();
${style.stylePluginBlock}
${style.staticPluginBlock}

app.start();
`;
}

/** 单应用 main.ts 内容 */
export function getMainTsSingle(opts: InitOptions): string {
  return buildMainTsBody(opts);
}

/** 多应用下单个应用的 main.ts 内容 */
export function getMainTsMulti(opts: InitOptions, appName: string): string {
  return buildMainTsBody(opts, appName);
}
