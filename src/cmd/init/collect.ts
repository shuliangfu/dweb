/**
 * 交互式收集 init 选项
 */

import {
  confirm,
  error as consoleError,
  info,
  input,
  interactiveMenu,
  prompt,
  separator,
  title,
} from "@dreamer/console";
import { args, cwd, resolve } from "@dreamer/runtime-adapter";
import { $tr } from "../../utils/i18n.ts";
import {
  APP_KINDS,
  CONSOLE_APP_NAME,
  ENGINES,
  EXAMPLE_LEVELS,
  RENDER_MODES,
  RUNTIMES,
  STYLES,
} from "./constants.ts";
import { isValidAppName, projectNameFromDir } from "./helpers.ts";
import type {
  AppKind,
  AppMode,
  ExampleLevel,
  InitAppSpec,
  InitOptions,
  RenderMode,
  Runtime,
  Style,
} from "./types.ts";

async function promptAppKind(
  excludeConsole: boolean,
): Promise<AppKind> {
  const labels = [
    $tr("init.appKindWeb"),
    $tr("init.appKindApi"),
    ...(excludeConsole ? [] : [$tr("init.appKindConsole")]),
  ];
  const kinds: AppKind[] = excludeConsole
    ? APP_KINDS.filter((k) => k !== "console")
    : [...APP_KINDS];
  const idx = await interactiveMenu($tr("init.appKind"), labels, 0);
  return kinds[idx] ?? "web";
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
  info($tr("init.creatingProject"));
  separator();

  const argv = overrideArgv ?? args();
  let targetDirRaw: string;
  if (argv.length > 0) {
    targetDirRaw = argv[0].trim();
    info($tr("init.projectNameFromArg", { name: targetDirRaw }));
  } else {
    const inputDir = await input(
      $tr("init.projectNamePrompt"),
      (v) => {
        const t = v.trim();
        if (!t) return $tr("init.projectNameRequired");
        if (t !== "." && !isValidAppName(t)) {
          return $tr("init.projectNameInvalid");
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

  const runtimeIdx = await interactiveMenu(
    $tr("init.runtime"),
    [$tr("init.runtimeDeno"), $tr("init.runtimeBun")],
    0,
  );
  const runtime: Runtime = RUNTIMES[runtimeIdx] ?? "deno";

  const appModeIdx = await interactiveMenu(
    $tr("init.appMode"),
    [$tr("init.appModeSingle"), $tr("init.appModeMulti")],
    0,
  );
  const appMode: AppMode = appModeIdx === 0 ? "single" : "multi";

  const apps: InitAppSpec[] = [];

  if (appMode === "single") {
    const kind = await promptAppKind(false);
    apps.push({ name: projectName, kind });
  } else {
    info($tr("init.appNamesHint"));
    while (true) {
      if (apps.length > 0) {
        info(
          $tr("init.appsAddedSoFar", {
            apps: apps.map((a) => `${a.name}(${a.kind})`).join(", "),
          }),
        );
        const addMore = await confirm($tr("init.addAnotherApp"), true);
        if (!addMore) break;
      }

      const hasConsole = apps.some((a) => a.kind === "console");
      const kind = await promptAppKind(hasConsole);

      let name: string;
      if (kind === "console") {
        name = CONSOLE_APP_NAME;
        info($tr("init.consoleNameFixed", { name }));
      } else {
        while (true) {
          const line = await prompt($tr("init.appNamePromptEmpty"));
          name = line?.trim() ?? "";
          if (!name) {
            consoleError($tr("init.appNameRequiredForKind"));
            continue;
          }
          if (!isValidAppName(name)) {
            consoleError($tr("init.appNameInvalid", { name }));
            continue;
          }
          if (apps.some((a) => a.name === name)) {
            consoleError($tr("init.appNameDuplicate", { name }));
            continue;
          }
          if (name === CONSOLE_APP_NAME) {
            consoleError($tr("init.appNameReservedConsole", { name }));
            continue;
          }
          break;
        }
      }

      apps.push({ name, kind });
    }
  }

  const hasWeb = apps.some((a) => a.kind === "web");

  let engine = ENGINES[0];
  let renderMode: RenderMode = "hybrid";
  let style: Style = "none";

  if (hasWeb) {
    const engineIdx = await interactiveMenu(
      $tr("init.uiEngine"),
      [
        $tr("init.uiEngineView"),
        $tr("init.uiEnginePreact"),
        $tr("init.uiEngineReact"),
      ],
      0,
    );
    engine = ENGINES[engineIdx] ?? ENGINES[0];

    const renderModeIdx = await interactiveMenu(
      $tr("init.renderMode"),
      [
        $tr("init.renderModeHybrid"),
        $tr("init.renderModeSsr"),
        $tr("init.renderModeCsr"),
        $tr("init.renderModeSsg"),
      ],
      0,
    );
    renderMode = RENDER_MODES[renderModeIdx] ?? "hybrid";

    const styleIdx = await interactiveMenu(
      $tr("init.style"),
      [$tr("init.styleTailwind"), $tr("init.styleUno"), $tr("init.styleNone")],
      0,
    );
    style = STYLES[styleIdx] ?? "tailwind";
  }

  const useSrc = await confirm($tr("init.useSrc"), true);

  const onlyConsole = apps.length === 1 && apps[0].kind === "console";
  const onlyApi = apps.every((a) => a.kind === "api");
  let exampleLevel: ExampleLevel = "with-about";
  if (onlyConsole) {
    const exampleIdx = await interactiveMenu(
      $tr("init.exampleLevelConsole"),
      [
        $tr("init.exampleConsoleWithCrond"),
        $tr("init.exampleConsoleMinimal"),
      ],
      0,
    );
    exampleLevel = EXAMPLE_LEVELS[exampleIdx] ?? "with-about";
  } else if (onlyApi || (!hasWeb && apps.some((a) => a.kind === "api"))) {
    const exampleIdx = await interactiveMenu(
      $tr("init.exampleLevelApi"),
      [
        $tr("init.exampleApiWithUsers"),
        $tr("init.exampleApiMinimal"),
      ],
      0,
    );
    exampleLevel = EXAMPLE_LEVELS[exampleIdx] ?? "with-about";
  } else if (hasWeb) {
    const exampleIdx = await interactiveMenu(
      $tr("init.exampleLevel"),
      [$tr("init.exampleWithAbout"), $tr("init.exampleMinimal")],
      0,
    );
    exampleLevel = EXAMPLE_LEVELS[exampleIdx] ?? "with-about";
  }

  return {
    targetDir,
    projectName,
    appMode,
    apps,
    appNames: appMode === "multi" ? apps.map((a) => a.name) : undefined,
    kind: appMode === "single" ? apps[0]?.kind : undefined,
    runtime,
    engine,
    renderMode,
    style,
    useSrc,
    exampleLevel,
    useBeta: useBeta ?? false,
  };
}
