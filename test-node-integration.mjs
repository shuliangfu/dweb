#!/usr/bin/env node
/**
 * Node.js integration test runner — one file per process (same invariant as test-node.mjs).
 *
 * 【范围】tests/integration/*.test.ts — 示例 build 子进程集成（需 Node 可 spawn
 * `node --import tsx` 跑示例 entry，见 tests/setup.ts IS_NODE 分支）。
 *
 * 【Invariant】单文件单进程；退出码为通过/失败唯一判据。每文件 300s 超时兜底。
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative, resolve } from "node:path";

process.env.CI = "true";

const PER_FILE_TIMEOUT_MS = 300_000;

const testDir = resolve("tests/integration");
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
console.log(`Found ${files.length} integration test files\n`);

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
    console.error(`✗ FAILED: ${rel} (exit ${result.status ?? "timeout"})`);
    failed++;
  } else {
    console.log(`✓ ${rel}\n`);
  }
}

console.log("============================================================");
if (failed > 0) {
  console.error(`✗ ${failed}/${files.length} integration file(s) failed`);
  process.exit(1);
}
console.log(`✓ All ${files.length} integration test files passed`);
