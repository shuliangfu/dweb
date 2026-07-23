#!/usr/bin/env node
/**
 * Node.js test runner — runs each test file in the MAIN process (no --test flag).
 *
 * 【Why 根源】Node 22's `node --test` forks a child process per file and uses the
 * child's stdout as the TAP/IPC message channel (parsed via structuredClone). When
 * a test file — or code under test — writes to stdout (e.g. `console.log()`), the
 * non-TAP bytes corrupt the parent's message parser, throwing "Unable to
 * deserialize cloned data due to invalid or unsupported version."
 *
 * `--test-isolation=none` would disable forking, but it is Node 23+ only. Our
 * `engines.node >= 22` constraint means CI runs Node 22, where the flag is absent.
 *
 * 【Fix】Run each file as the entry point (`node --import tsx <file>`) WITHOUT the
 * `--test` flag. `node:test` auto-runs registered tests IN-PROCESS when the module
 * is the main entry — no child process, no IPC, no serialization bug. The process
 * exit code still reflects results (0 on pass, 1 on fail). `--test-force-exit`
 * ensures the process exits even if a test leaves dangling handles (timers etc.).
 *
 * 【Invariant】One file per process invocation; exit code is the single source of
 * truth for pass/fail. 仅跑 unit 测试；e2e 浏览器测试由 test-node-e2e.mjs 单独跑
 * （需 Playwright Chromium），integration 需 spawn 示例子进程亦排除。
 *
 * 【排除清单】以下 unit 测试因运行时专有行为或外部依赖在 Node CI 中排除：
 * - cmd-*.test.ts：测试 dweb CLI 命令参数拼装，部分断言依赖 Deno/Bun 子进程行为
 *   （经 getSpawnArgsForDwebTask 返回运行时专有参数），Node 下逻辑不同，按根源
 *   原则不强行适配而是排除，避免打补丁。
 * - init.test.ts / project.test.ts：spawn 真实 dweb 示例子进程做项目初始化/检测，
 *   Node 下示例项目 deno.json tasks 无法直接 npm run，属集成性质。
 * - test-launcher.test.ts：测试 dweb test 命令的子进程启动，依赖宿主运行时 spawn。
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve, relative } from "node:path";

// 显式置 CI=true：使脚本自包含，不依赖 Unix shell 前缀语法（Windows 不支持
// `CI=true node ...`）也不依赖外部环境。GitHub Actions 也自动设置 CI=true。
process.env.CI = "true";

// Node CI 下排除的测试文件（运行时专有行为或需子进程/外部服务）
const EXCLUDE_PATTERNS = [
  "cmd-build.test.ts",
  "cmd-clean.test.ts",
  "cmd-dev.test.ts",
  "cmd-fmt.test.ts",
  "cmd-lint.test.ts",
  "cmd-preview.test.ts",
  "cmd-start.test.ts",
  "cmd-test.test.ts",
  "cmd-update.test.ts",
  "cmd-upgrade.test.ts",
  "init.test.ts",
  "project.test.ts",
  "test-launcher.test.ts",
];

function collectTests(dir, base = dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...collectTests(full, base));
    } else if (entry.endsWith(".test.ts") && !EXCLUDE_PATTERNS.includes(entry)) {
      results.push(full);
    }
  }
  return results.sort();
}

const testDir = resolve("tests/unit");
if (!existsSync(testDir)) {
  console.error(`Test directory not found: ${testDir}`);
  process.exit(1);
}

const files = collectTests(testDir);
console.log(`Found ${files.length} test files (excluding ${EXCLUDE_PATTERNS.length} runtime-specific files)\n`);

let failed = 0;
for (const file of files) {
  const rel = relative(process.cwd(), file);
  console.log(`▶ ${rel}`);
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test-force-exit", file],
    {
      stdio: "inherit",
      env: { ...process.env, CI: "true" },
    },
  );
  if (result.status !== 0) {
    failed++;
    console.error(`✗ FAILED: ${rel}\n`);
  } else {
    console.log(`✓ ${rel}\n`);
  }
}

console.log("=".repeat(60));
if (failed > 0) {
  console.error(`✗ ${failed}/${files.length} test file(s) failed`);
  process.exit(1);
}
console.log(`✓ All ${files.length} test files passed`);
