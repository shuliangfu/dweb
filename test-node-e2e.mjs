#!/usr/bin/env node
/**
 * Node.js e2e test runner — runs each e2e test file in the MAIN process.
 *
 * 与 test-node.mjs 同理：`node --import tsx --test-force-exit <file>` 不带 `--test`，
 * 让 node:test 在主进程内自动执行注册的用例（无 fork/IPC，避开 stdout 污染 TAP 通道）。
 *
 * 【范围】tests/e2e/*.test.ts——浏览器渲染 e2e（需 Playwright Chromium）+ server-request。
 *   - 依赖 CI 预装 Chromium（`npx playwright install chromium`）。
 *   - 每文件独立进程，串行执行（e2e 启动 dev server + 浏览器，并行会争抢端口/资源）。
 *   - Windows 需额外 setup-chrome（与 Deno CI 一致）。
 *
 * 【Invariant】单文件单进程；退出码为通过/失败唯一判据。每文件 240s 超时兜底，
 * 避免 dev server 启动失败或浏览器卡住时无限挂起。
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative, resolve } from "node:path";

process.env.CI = "true";

const PER_FILE_TIMEOUT_MS = 240_000;

const testDir = resolve("tests/e2e");
if (!existsSync(testDir)) {
  console.error(`Test directory not found: ${testDir}`);
  process.exit(1);
}

function collectTests(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...collectTests(full));
    } else if (entry.endsWith(".test.ts")) {
      results.push(full);
    }
  }
  return results.sort();
}

const files = collectTests(testDir);
console.log(`Found ${files.length} e2e test files\n`);

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
      timeout: PER_FILE_TIMEOUT_MS,
    },
  );
  if (result.status !== 0) {
    failed++;
    if (result.status === null) {
      console.error(`✗ TIMEOUT (${PER_FILE_TIMEOUT_MS}ms): ${rel}\n`);
    } else {
      console.error(`✗ FAILED: ${rel}\n`);
    }
  } else {
    console.log(`✓ ${rel}\n`);
  }
}

console.log("=".repeat(60));
if (failed > 0) {
  console.error(`✗ ${failed}/${files.length} e2e test file(s) failed`);
  process.exit(1);
}
console.log(`✓ All ${files.length} e2e test files passed`);
