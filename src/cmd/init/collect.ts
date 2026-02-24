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
  ENGINES,
  EXAMPLE_LEVELS,
  RENDER_MODES,
  RUNTIMES,
  STYLES,
} from "./constants.ts";
import { isValidAppName, projectNameFromDir } from "./helpers.ts";
import type {
  AppMode,
  ExampleLevel,
  InitOptions,
  RenderMode,
  Runtime,
  Style,
} from "./types.ts";

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
    "\n" + $tr("init.runtime"),
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

  const appNames: string[] = [];
  if (appMode === "multi") {
    info($tr("init.appNamesHint"));
    while (true) {
      const hint = appNames.length > 0
        ? $tr("init.appNamePromptWithAdded", { apps: appNames.join(", ") })
        : $tr("init.appNamePromptEmpty");
      const line = await prompt(hint);
      const name = line?.trim() ?? "";
      if (name === "") {
        if (appNames.length === 0) {
          consoleError($tr("init.appNameMinOne"));
          continue;
        }
        break;
      }
      if (!isValidAppName(name)) {
        consoleError($tr("init.appNameInvalid", { name }));
        continue;
      }
      if (appNames.includes(name)) {
        consoleError($tr("init.appNameDuplicate", { name }));
        continue;
      }
      appNames.push(name);
    }
  }

  const engineIdx = await interactiveMenu(
    $tr("init.uiEngine"),
    [
      $tr("init.uiEngineView"),
      $tr("init.uiEnginePreact"),
      $tr("init.uiEngineReact"),
    ],
    0,
  );
  const engine = ENGINES[engineIdx] ?? ENGINES[0];

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
  const renderMode: RenderMode = RENDER_MODES[renderModeIdx] ?? "hybrid";

  const styleIdx = await interactiveMenu(
    $tr("init.style"),
    [$tr("init.styleTailwind"), $tr("init.styleUno"), $tr("init.styleNone")],
    0,
  );
  const style: Style = STYLES[styleIdx] ?? "tailwind";

  const useSrc = await confirm($tr("init.useSrc"), true);

  const exampleIdx = await interactiveMenu(
    $tr("init.exampleLevel"),
    [$tr("init.exampleWithAbout"), $tr("init.exampleMinimal")],
    0,
  );
  const exampleLevel: ExampleLevel = EXAMPLE_LEVELS[exampleIdx] ?? "with-about";

  return {
    targetDir,
    projectName,
    appMode,
    appNames: appMode === "multi" ? appNames : undefined,
    runtime,
    engine,
    renderMode,
    style,
    useSrc,
    exampleLevel,
    useBeta: useBeta ?? false,
  };
}
