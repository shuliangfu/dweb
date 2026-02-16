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
import { $t } from "../../utils/i18n.ts";
import { ENGINES, EXAMPLE_LEVELS, RENDER_MODES, STYLES } from "./constants.ts";
import { isValidAppName, projectNameFromDir } from "./helpers.ts";
import type {
  AppMode,
  ExampleLevel,
  InitOptions,
  RenderMode,
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
    [
      $t("init.uiEngineView"),
      $t("init.uiEnginePreact"),
      $t("init.uiEngineReact"),
    ],
    0,
  );
  const engine = ENGINES[engineIdx] ?? ENGINES[0];

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
  const renderMode: RenderMode = RENDER_MODES[renderModeIdx] ?? "hybrid";

  const styleIdx = await interactiveMenu(
    $t("init.style"),
    [$t("init.styleTailwind"), $t("init.styleUno"), $t("init.styleNone")],
    0,
  );
  const style: Style = STYLES[styleIdx] ?? "tailwind";

  const useSrc = await confirm($t("init.useSrc"), true);

  const exampleIdx = await interactiveMenu(
    $t("init.exampleLevel"),
    [$t("init.exampleWithAbout"), $t("init.exampleMinimal")],
    0,
  );
  const exampleLevel: ExampleLevel = EXAMPLE_LEVELS[exampleIdx] ?? "with-about";

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
