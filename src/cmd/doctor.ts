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
  /** 失败时是否只警告（不计入 failed / 退出码 1） */
  warn?: boolean;
}

function parseSemver(version: string): [number, number, number] | null {
  const m = version.trim().replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function gte(version: string, min: [number, number, number]): boolean {
  const v = parseSemver(version);
  if (!v) return false;
  for (let i = 0; i < 3; i++) {
    if (v[i] > min[i]) return true;
    if (v[i] < min[i]) return false;
  }
  return true;
}

/**
 * HTTP2Shell / CVE-2026-111497：Node / Bun 的 Brotli 修复线。
 * Deno 不在该 CVE 范围内。Node 22/24/26 须达到补丁版本，更高主版本视为已覆盖。
 */
export function isRuntimeBrotliPatched(
  runtime: string,
  version: string,
): boolean {
  if (runtime === "deno") return true;
  if (runtime === "bun") return gte(version, [1, 4, 4]);
  if (runtime === "node") {
    const v = parseSemver(version);
    if (!v) return false;
    const major = v[0];
    if (major > 26) return true;
    if (major === 26) return gte(version, [26, 12, 1]);
    if (major === 24) return gte(version, [24, 22, 1]);
    if (major === 22) return gte(version, [22, 23, 4]);
    return false;
  }
  return true;
}

export function readHostRuntimeVersion(
  runtime: string,
): string | undefined {
  const proc = (globalThis as {
    process?: { versions?: Record<string, string>; version?: string };
  }).process;
  if (runtime === "node") {
    return proc?.versions?.node ?? proc?.version?.replace(/^v/, "");
  }
  if (runtime === "bun") {
    const bun = (globalThis as { Bun?: { version?: string } }).Bun?.version ??
      proc?.versions?.bun;
    return bun;
  }
  return undefined;
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

  const hostVersion = readHostRuntimeVersion(runtime);
  if (IS_NODE || IS_BUN) {
    const ok = !!hostVersion && isRuntimeBrotliPatched(runtime, hostVersion);
    const need = IS_NODE
      ? "Node >=22.23.4 / >=24.22.1 / >=26.12.1 (HTTP2Shell)"
      : "Bun >=1.4.4 (HTTP2Shell)";
    checks.push({
      name: "runtime-brotli-patch",
      ok,
      warn: true,
      detail: hostVersion
        ? (ok ? hostVersion : `${hostVersion} is below ${need}`)
        : `unknown version; require ${need}`,
    });
  }

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
    if (c.ok) success(`ok  ${c.name}: ${c.detail}`);
    else if (c.warn) {
      info(`WARN  ${c.name}: ${c.detail}`);
    } else {
      error(`FAIL  ${c.name}: ${c.detail}`);
      failed++;
    }
  }
  info(
    "hint: production defaults — securityHeaders ON, rateLimit ON, compression ON; session enables CSRF (csrf: false to opt out) and requires cookie.secret; trustProxy stays off unless a proxy strips forwarded headers; inbound Content-Encoding br is rejected (415); cors/upload still opt-in.",
  );
  if (!projectInfo) {
    error($tr("common.noDenoJson"));
    exit(2);
  }
  if (failed > 0) exit(1);
}
