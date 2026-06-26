/**
 * Bun 测试 preload
 *
 * bson@7.3+ / mongodb 在模块初始化时会调用 `node:v8.isBuildingSnapshot()`，
 * 而 Bun 尚未实现该 API，导致 `bun test` 在 import 阶段即失败。
 * 本文件通过 Bun 的 mock.module 在测试套件加载前注入兼容桩。
 *
 * 配置见仓库根目录 `bunfig.toml` 的 `[test].preload`。
 */

const g = globalThis as { Bun?: unknown };

if (g.Bun) {
  const { mock } = await import("bun:test");
  mock.module("node:v8", () => ({
    isBuildingSnapshot: () => false,
  }));
}
