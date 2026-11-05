/**
 * dweb-cli doctor — 环境／项目健康检查（加法）。
 *
 * 意图：一次输出 runtime、deno.json、关键依赖与安全默认提示，便于排障。
 * 退出码：0 通过；1 有失败项；2 无项目。
 */

import { error, info, success } from "@dreamer/console";
import { cwd, exists, readTextFile } from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { $tr } from "../utils/i18n.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getDwebVersion } from "../utils/version.ts";
import { getRuntime, IS_BUN, IS_DENO, IS_NODE } from "../utils/runtime.ts";
import { exit } from "@dreamer/runtime-adapter";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export async function main(
  _args: string[],
  _options: ParsedOptions,
): Promise<void> {
  const projectRoot = cwd();
  const checks: Check[] = [];

  const runtime = getRuntime();
  checks.push({
    name: "runtime",
    ok: IS_DENO || IS_BUN || IS_NODE,
    detail: runtime,
  });

  const projectInfo = await getProjectInfo(projectRoot);
  checks.push({
    name: "deno.json",
    ok: !!projectInfo,
    detail: projectInfo ? projectRoot : "missing",
  });

  const version = await getDwebVersion();
  checks.push({
    name: "dweb-version",
    ok: !!version,
    detail: version || "unknown",
  });

  if (projectInfo) {
    const imports = (projectInfo as { imports?: Record<string, string> })
      .imports ?? {};
    // projectInfo may not expose imports — read file
    let importMap: Record<string, string> = {};
    try {
      const raw = await readTextFile(`${projectRoot}/deno.json`);
      importMap = (JSON.parse(raw) as { imports?: Record<string, string> })
        .imports ?? {};
    } catch {
      importMap = imports;
    }
    for (
      const key of [
        "@dreamer/view",
        "@dreamer/render",
        "@dreamer/server",
        "@dreamer/upload",
      ]
    ) {
      const spec = importMap[key];
      checks.push({
        name: `dep:${key}`,
        ok: key === "@dreamer/upload" ? true : !!spec, // upload optional
        detail: spec ??
          (key === "@dreamer/upload" ? "(optional, not pinned)" : "MISSING"),
      });
    }

    const lockOk = await exists(`${projectRoot}/deno.lock`) ||
      await exists(`${projectRoot}/package-lock.json`) ||
      await exists(`${projectRoot}/bun.lock`);
    checks.push({
      name: "lockfile",
      ok: lockOk,
      detail: lockOk ? "present" : "missing (optional)",
    });
  }

  info("dweb-cli doctor");
  let failed = 0;
  for (const c of checks) {
    const line = `${c.ok ? "ok" : "FAIL"}  ${c.name}: ${c.detail}`;
    if (c.ok) success(line);
    else {
      error(line);
      failed++;
    }
  }
  info(
    "hint: production defaults — securityHeaders ON, rateLimit ON, compression ON; cors/csrf/upload opt-in. Set false to escape.",
  );
  if (!projectInfo) {
    error($tr("common.noDenoJson"));
    exit(2);
  }
  if (failed > 0) exit(1);
}
