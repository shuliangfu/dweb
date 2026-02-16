/**
 * dweb upgrade 命令
 *
 * 职责：
 * - 检查并升级 dweb 到最新版本
 * - 从 JSR 获取最新版本信息
 * - 发现新版本时自动重新安装 dweb-cli
 * - 支持 --beta 选项：默认仅升级稳定版，--beta 时可升级到 beta 最新版
 *
 * 运行方式：
 * - dweb upgrade          # 仅升级到稳定版
 * - dweb upgrade --beta   # 可升级到 beta 最新版
 */

import {
  error,
  failSpinner,
  info,
  startSpinner,
  succeedSpinner,
  success,
} from "@dreamer/console";
import { createCommand } from "@dreamer/runtime-adapter";
import { $t } from "../utils/i18n.ts";
import type { ParsedOptions } from "../feature/command.ts";
import { fetchJsrLatestVersion } from "../utils/jsr-versions.ts";
import { getDwebVersion, writeVersionCache } from "../utils/version.ts";
import { getRunArgs, getRuntime } from "../utils/runtime.ts";

/**
 * 解析版本号用于比较（简化：仅比较主.次.修订）
 */
function parseVersion(v: string): number[] {
  const match = v.replace(/-.*$/, "").match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
  ];
}

function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

/**
 * upgrade 命令主入口
 *
 * @param _args 命令行参数（未使用）
 * @param options 解析后的选项，options.beta 为 true 时升级到 beta 最新版
 */
export async function main(
  _args: string[],
  options: ParsedOptions,
): Promise<void> {
  const useBeta = options?.beta === true;
  const runtime = getRuntime();
  const current = await getDwebVersion();
  info($t("upgrade.currentVersion", { version: current }));
  info($t("upgrade.checkingLatest"));

  const latest = await fetchJsrLatestVersion("@dreamer/dweb", useBeta);
  if (!latest) {
    error($t("upgrade.cannotGetLatest"));
    return;
  }

  if (current === latest || !isNewer(latest, current)) {
    success($t("upgrade.alreadyLatest", { version: current }));
    return;
  }

  success($t("upgrade.newVersionFound", { version: latest }));

  const setupSpec = `jsr:@dreamer/dweb@${latest}/setup`;
  const cmd = createCommand(runtime, {
    args: getRunArgs(setupSpec),
    stdout: "null",
    stderr: "null",
    stdin: "inherit",
  });
  startSpinner($t("upgrade.installing"));
  const child = cmd.spawn();
  const status = await child.status;

  if (status.success) {
    succeedSpinner($t("upgrade.upgradedTo", { version: latest }));
    await writeVersionCache(latest);
    return;
  } else {
    failSpinner($t("upgrade.autoInstallFailed"));
    error($t("upgrade.manualInstall"));
    info($t("upgrade.manualExample", { spec: setupSpec }));
    info($t("upgrade.orManualVersion"));
  }
}
