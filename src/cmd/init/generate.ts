/**
 * 根据 init 选项生成项目目录与文件
 */

import { failSpinner, startSpinner, succeedSpinner } from "@dreamer/console";
import {
  chmod,
  ensureDir,
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
import type { InitOptions, JsrVersions } from "./types.ts";
import { getDenoJson } from "./templates/deno-json.ts";
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
import { getDockerComposeYml, getDockerfile } from "./templates/docker.ts";
import {
  getDeploySh,
  getFaviconSvg,
  getGitignore,
  getJsxDts,
  getTailwindCss,
  getUnoCss,
  getVscodeSettingsJson,
} from "./templates/static.ts";

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
    await writeTextFile(
      join(commonBase, "components", "Button.tsx"),
      getButtonTsx(opts),
    );

    for (const appName of appNames) {
      const appBase = join(targetDir, prefix, appName);
      await ensureDir(join(appBase, "config"));
      await ensureDir(join(appBase, "routes"));
      await ensureDir(join(appBase, "components"));
      await ensureDir(join(appBase, "assets"));

      await writeTextFile(
        join(appBase, "main.ts"),
        getMainTsMulti(opts, appName),
      );
      await writeTextFile(
        join(appBase, "config", "main.ts"),
        getConfigMainTs(
          opts,
          appName,
          DEFAULT_PORT_BASE + appNames.indexOf(appName),
        ),
      );
      await writeTextFile(
        join(appBase, "config", "main.dev.ts"),
        getConfigMainDevTs(DEFAULT_PORT_BASE + appNames.indexOf(appName)),
      );
      await writeTextFile(
        join(appBase, "config", "main.prod.ts"),
        getConfigMainProdTs(DEFAULT_PORT_BASE + appNames.indexOf(appName)),
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
      await writeTextFile(
        join(appBase, "assets", "favicon.svg"),
        getFaviconSvg(),
      );
    }
  } else {
    const configBase = useSrc
      ? join(targetDir, "src", "config")
      : join(targetDir, "config");
    await ensureDir(configBase);
    await ensureDir(join(targetDir, prefix, "routes"));
    await ensureDir(join(targetDir, prefix, "components"));
    await ensureDir(join(targetDir, prefix, "assets"));

    await writeTextFile(
      join(targetDir, prefix, "components", "Button.tsx"),
      getButtonTsx(opts),
    );
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
    await writeTextFile(
      join(targetDir, prefix, "assets", "favicon.svg"),
      getFaviconSvg(),
    );
  }

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
  await writeTextFile(
    join(targetDir, "deno.json"),
    getDenoJson(opts, jsrVersions),
  );
  if (opts.engine === "view") {
    await writeTextFile(join(targetDir, "jsx.d.ts"), getJsxDts());
  }
  await writeTextFile(join(targetDir, ".gitignore"), getGitignore());

  await writeTextFile(join(targetDir, "Dockerfile"), getDockerfile());
  await writeTextFile(
    join(targetDir, "docker-compose.yml"),
    getDockerComposeYml(opts),
  );
  if (platform() !== "windows") {
    const deployShPath = join(targetDir, "deploy.sh");
    await writeTextFile(deployShPath, getDeploySh());
    await chmod(deployShPath, 0o755);
  }

  await ensureDir(join(targetDir, "runtime", "deno-cache"));
  await ensureDir(join(targetDir, "runtime", "logs"));

  await ensureDir(join(targetDir, ".vscode"));
  await writeTextFile(
    join(targetDir, ".vscode", "settings.json"),
    getVscodeSettingsJson(),
  );
}
