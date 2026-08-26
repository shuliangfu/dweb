/**
 * 根据 init 选项生成项目目录与文件
 */

import {
  confirm,
  failSpinner,
  info,
  startSpinner,
  succeedSpinner,
} from "@dreamer/console";
import {
  chmod,
  dirname,
  ensureDir,
  exists,
  join,
  platform,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { $tr } from "../../utils/i18n.ts";
import { fetchDreamerVersions } from "../../utils/jsr-versions.ts";
import {
  type DwebDenoConfig,
  FALLBACK_DWEB_VERSION,
  loadDwebDenoJson,
} from "../../utils/version.ts";
import { DEFAULT_PORT_BASE, FALLBACK_VIEW_VERSION } from "./constants.ts";
import {
  getAppKind,
  optsForKind,
  resolveApps,
} from "./helpers.ts";
import type { AppKind, InitAppSpec, InitOptions, JsrVersions } from "./types.ts";
import { getDenoJson } from "./templates/deno-json.ts";
import { getPackageJson } from "./templates/package-json.ts";
import { getMainTsMulti, getMainTsSingle } from "./templates/main.ts";
import {
  getCommonConfigMainDevTs,
  getCommonConfigMainTs,
  getCommonSubdirModTs,
  getCommonUtilsModTs,
  getConfigMainDevTs,
  getConfigMainProdTs,
  getConfigMainTs,
} from "./templates/config.ts";
import {
  getAboutTsx,
  getAppTsx,
  getButtonTsx,
  getIndexTsx,
  getLayoutTsx,
  getUserByIdTsx,
} from "./templates/components.ts";
import { listApiRouteFiles } from "./templates/api-routes.ts";
import { listConsoleRouteFiles } from "./templates/console-routes.ts";
import { getDockerComposeYml, getDockerfile } from "./templates/docker.ts";
import {
  getDeploySh,
  getExampleTestTs,
  getFaviconSvg,
  getGitignore,
  getI18nAllyCustomFrameworkYml,
  getNpmrc,
  getTailwindCss,
  getTsconfigJson,
  getUnoCss,
  getVscodeSettingsJson,
} from "./templates/static.ts";

/** 用户在校验「目录已存在」时选择不覆盖，generate 抛出此错误以便 main 提示取消 */
export class InitCancelledError extends Error {
  constructor() {
    super("init.cancelled");
    this.name = "InitCancelledError";
  }
}

async function writeRouteFiles(
  routesBase: string,
  files: Array<{ relativePath: string; content: string }>,
): Promise<void> {
  for (const f of files) {
    const full = join(routesBase, f.relativePath);
    await ensureDir(dirname(full));
    await writeTextFile(full, f.content);
  }
}

async function generateWebAppFiles(
  opts: InitOptions,
  appBase: string,
  appName: string | undefined,
  port: number,
): Promise<void> {
  const exampleLevel = opts.exampleLevel;
  const style = opts.style;
  const webOpts = optsForKind(opts, "web");

  await ensureDir(join(appBase, "config"));
  await ensureDir(join(appBase, "routes"));
  await ensureDir(join(appBase, "components"));
  await ensureDir(join(appBase, "assets"));

  await writeTextFile(
    join(appBase, "main.ts"),
    appName != null ? getMainTsMulti(webOpts, appName) : getMainTsSingle(webOpts),
  );
  await writeTextFile(
    join(appBase, "config", "main.ts"),
    getConfigMainTs(webOpts, appName, port, "web"),
  );
  await writeTextFile(
    join(appBase, "config", "main.dev.ts"),
    getConfigMainDevTs(port),
  );
  await writeTextFile(
    join(appBase, "config", "main.prod.ts"),
    getConfigMainProdTs(port),
  );
  await writeTextFile(join(appBase, "components", "Button.tsx"), getButtonTsx(webOpts));
  await writeTextFile(join(appBase, "routes", "_app.tsx"), getAppTsx(webOpts));
  await writeTextFile(
    join(appBase, "routes", "_layout.tsx"),
    getLayoutTsx(webOpts, appName),
  );
  await writeTextFile(join(appBase, "routes", "index.tsx"), getIndexTsx(webOpts));
  if (exampleLevel === "with-about") {
    await writeTextFile(join(appBase, "routes", "about.tsx"), getAboutTsx(webOpts));
    await ensureDir(join(appBase, "routes", "user"));
    await writeTextFile(
      join(appBase, "routes", "user", "[id].tsx"),
      getUserByIdTsx(webOpts),
    );
  }
  if (style === "tailwind") {
    await writeTextFile(join(appBase, "assets", "tailwind.css"), getTailwindCss());
  }
  if (style === "unocss") {
    await writeTextFile(join(appBase, "assets", "uno.css"), getUnoCss());
  }
  await writeTextFile(join(appBase, "assets", "favicon.svg"), getFaviconSvg());
}

async function generateApiAppFiles(
  opts: InitOptions,
  appBase: string,
  appName: string | undefined,
  port: number,
): Promise<void> {
  const apiOpts = optsForKind(opts, "api");
  await ensureDir(join(appBase, "config"));
  await ensureDir(join(appBase, "routes"));

  await writeTextFile(
    join(appBase, "main.ts"),
    appName != null ? getMainTsMulti(apiOpts, appName) : getMainTsSingle(apiOpts),
  );
  await writeTextFile(
    join(appBase, "config", "main.ts"),
    getConfigMainTs(apiOpts, appName, port, "api"),
  );
  await writeTextFile(
    join(appBase, "config", "main.dev.ts"),
    getConfigMainDevTs(port),
  );
  await writeTextFile(
    join(appBase, "config", "main.prod.ts"),
    getConfigMainProdTs(port),
  );
  await writeRouteFiles(
    join(appBase, "routes"),
    listApiRouteFiles(opts.exampleLevel),
  );
}

async function generateConsoleAppFiles(
  opts: InitOptions,
  appBase: string,
  appName: string | undefined,
): Promise<void> {
  const consoleOpts = optsForKind(opts, "console");
  await ensureDir(join(appBase, "config"));
  await ensureDir(join(appBase, "routes"));

  await writeTextFile(
    join(appBase, "main.ts"),
    appName != null
      ? getMainTsMulti(consoleOpts, appName)
      : getMainTsSingle(consoleOpts),
  );
  await writeTextFile(
    join(appBase, "config", "main.ts"),
    getConfigMainTs(consoleOpts, appName, undefined, "console"),
  );
  // console 不需要 server port 的 dev/prod 覆盖；仍写空增量便于习惯
  await writeTextFile(
    join(appBase, "config", "main.dev.ts"),
    `/** ${$tr("init.comments.devConfig")} */\nexport default {};\n`,
  );
  await writeTextFile(
    join(appBase, "config", "main.prod.ts"),
    `/** ${$tr("init.comments.prodConfig")} */\nexport default {};\n`,
  );
  await writeRouteFiles(
    join(appBase, "routes"),
    listConsoleRouteFiles(opts.exampleLevel),
  );
}

async function generateAppByKind(
  opts: InitOptions,
  app: InitAppSpec,
  appBase: string,
  port: number,
  isMulti: boolean,
): Promise<void> {
  const appName = isMulti ? app.name : undefined;
  switch (app.kind) {
    case "api":
      await generateApiAppFiles(opts, appBase, appName, port);
      break;
    case "console":
      await generateConsoleAppFiles(opts, appBase, appName);
      break;
    default:
      await generateWebAppFiles(opts, appBase, appName, port);
  }
}

/**
 * 根据选项生成项目文件。
 * 先校验目标目录是否存在并征得用户确认，再拉取版本，最后才创建项目目录并写入文件；绝不先创建目录再校验。
 */
export async function generate(opts: InitOptions): Promise<void> {
  const { targetDir, useSrc, appMode } = opts;
  const prefix = useSrc ? "src/" : "";
  const apps = resolveApps(opts);
  const isMulti = appMode === "multi" && apps.length > 0 &&
    (opts.appNames != null || opts.apps != null);

  // 先校验目录是否存在，通过后再创建；不先创建目录
  const targetExists = await exists(targetDir);
  if (targetExists) {
    const go = await confirm(
      $tr("init.dirExistsConfirm", { path: targetDir }),
      false,
    );
    if (!go) {
      info($tr("init.cancelled"));
      throw new InitCancelledError();
    }
  }

  // 拉取版本（仍不创建目录）
  const useBeta = opts.useBeta ?? false;
  startSpinner($tr("init.fetchingVersions"));
  let dwebConfig: DwebDenoConfig | null = null;
  let jsrVersions: JsrVersions;
  try {
    dwebConfig = await loadDwebDenoJson();
    jsrVersions = await fetchDreamerVersions(useBeta, dwebConfig);
    succeedSpinner($tr("init.fetched"));
  } catch {
    failSpinner($tr("init.fetchFailed"));
    jsrVersions = {
      dweb: dwebConfig?.version ?? FALLBACK_DWEB_VERSION,
      render: "1.0.0",
      router: "1.0.0",
      plugins: "1.0.0",
      view: FALLBACK_VIEW_VERSION,
    };
  }

  // 校验通过且准备工作完成后，再创建项目根目录并写入文件
  await ensureDir(targetDir);

  if (isMulti) {
    const commonBase = join(targetDir, prefix, "common");
    await ensureDir(join(commonBase, "config"));
    await ensureDir(join(commonBase, "components"));
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
    if (apps.some((a) => a.kind === "web")) {
      await writeTextFile(
        join(commonBase, "components", "Button.tsx"),
        getButtonTsx(optsForKind(opts, "web")),
      );
    }

    let httpIndex = 0;
    for (const app of apps) {
      const appBase = join(targetDir, prefix, app.name);
      const port = app.kind === "console"
        ? DEFAULT_PORT_BASE
        : DEFAULT_PORT_BASE + httpIndex++;
      await generateAppByKind(opts, app, appBase, port, true);
    }
  } else {
    const app = apps[0] ?? { name: opts.projectName, kind: getAppKind(opts) };
    const appBase = join(targetDir, prefix);
    // 单应用：config 在 prefix/config（useSrc 时 src/config）
    await generateAppByKind(opts, app, appBase, DEFAULT_PORT_BASE, false);
  }

  if (opts.runtime === "deno") {
    await writeTextFile(
      join(targetDir, "deno.json"),
      getDenoJson(opts, jsrVersions),
    );
  }
  if (opts.runtime === "bun") {
    await writeTextFile(
      join(targetDir, "package.json"),
      getPackageJson(opts, jsrVersions),
    );
    await writeTextFile(join(targetDir, ".npmrc"), getNpmrc());
    await writeTextFile(
      join(targetDir, "tsconfig.json"),
      getTsconfigJson(opts),
    );
  }
  await writeTextFile(join(targetDir, ".gitignore"), getGitignore());

  // 示例测试：dweb-cli test → 宿主 test；用例 API 来自 @dreamer/test
  await ensureDir(join(targetDir, "tests", "unit"));
  await writeTextFile(
    join(targetDir, "tests", "unit", "example.test.ts"),
    getExampleTestTs(),
  );

  await writeTextFile(join(targetDir, "Dockerfile"), getDockerfile(opts));
  await writeTextFile(
    join(targetDir, "docker-compose.yml"),
    getDockerComposeYml(opts),
  );
  if (platform() !== "windows") {
    const deployShPath = join(targetDir, "deploy.sh");
    await writeTextFile(deployShPath, getDeploySh());
    await chmod(deployShPath, 0o755);
  }

  await ensureDir(join(targetDir, "runtime", "logs"));
  if (opts.runtime === "deno") {
    await ensureDir(join(targetDir, "runtime", "deno-cache"));
  }

  await ensureDir(join(targetDir, ".vscode"));
  await writeTextFile(
    join(targetDir, ".vscode", "settings.json"),
    getVscodeSettingsJson(opts),
  );
  await writeTextFile(
    join(targetDir, ".vscode", "i18n-ally-custom-framework.yml"),
    getI18nAllyCustomFrameworkYml(),
  );
}

// re-export for callers that might want AppKind locally
export type { AppKind };
