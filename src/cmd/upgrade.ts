/**
 * dweb upgrade 命令
 *
 * 职责：
 * - 检查并升级 dweb 到最新版本
 * - 从 JSR 获取最新版本信息
 *
 * 运行方式：
 * - dweb upgrade
 */

import { error, info, success } from "@dreamer/console";
import type { ParsedOptions } from "../feature/command.ts";
import { getDwebVersion } from "../utils/version.ts";

const JSR_PACKAGE_URL = "https://jsr.io/@dreamer/dweb/meta.json";

/**
 * 从 JSR 获取包的最新版本
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(JSR_PACKAGE_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { latest?: string; versions?: string[] };
    return data.latest ?? data.versions?.[data.versions.length - 1] ?? null;
  } catch {
    return null;
  }
}

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
 * @param _options 解析后的选项（未使用）
 */
export async function main(
  _args: string[],
  _options: ParsedOptions,
): Promise<void> {
  const current = await getDwebVersion();
  info(`当前版本: ${current}`);
  info("正在检查最新版本...");

  const latest = await fetchLatestVersion();
  if (!latest) {
    error("无法获取最新版本信息，请检查网络连接");
    return;
  }

  if (current === latest || !isNewer(latest, current)) {
    success(`已是最新版本: ${current}`);
    return;
  }

  success(`发现新版本: ${latest}`);
  info("升级方式:");
  info("  deno: deno add jsr:@dreamer/dweb@latest");
  info("  bun:  bun add jsr:@dreamer/dweb@latest");
  info("或手动修改 deno.json / package.json 中的 @dreamer/dweb 版本号");
}
