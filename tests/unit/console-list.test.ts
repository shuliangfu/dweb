/**
 * console --list 扫描单元测试
 */

import "../setup.ts";
import {
  ensureDir,
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterEach, beforeEach, describe, expect, it } from "@dreamer/test";
import {
  formatConsoleCommandList,
  listConsoleCommands,
} from "../../src/feature/console-list.ts";

describe("console-list", () => {
  let tmp: string;
  let routesDir: string;

  beforeEach(async () => {
    tmp = await makeTempDir({ prefix: "dweb-console-list-" });
    routesDir = join(tmp, "routes");
    await ensureDir(routesDir);
  });

  afterEach(async () => {
    try {
      await remove(tmp, { recursive: true });
    } catch {
      // ignore
    }
  });

  it("应列出聚合文件的具名动作与 meta 描述", async () => {
    await writeTextFile(
      join(routesDir, "hello.ts"),
      `export const meta = {
  description: "Hello cmds",
  actions: { world: { description: "Say hi" } },
};
export async function world() {}
`,
    );
    const list = await listConsoleCommands(routesDir);
    expect(list.some((c) => c.route === "hello/world")).toBe(true);
    const world = list.find((c) => c.route === "hello/world")!;
    expect(world.description).toBe("Say hi");
  });

  it("应列出精确文件的 default 动作", async () => {
    await ensureDir(join(routesDir, "cache"));
    await writeTextFile(
      join(routesDir, "cache", "clear.ts"),
      `export const meta = { description: "Flush cache" };
export default async function () {}
`,
    );
    const list = await listConsoleCommands(routesDir);
    expect(list.some((c) => c.route === "cache/clear")).toBe(true);
  });

  it("filterPrefix 应过滤模块", async () => {
    await writeTextFile(
      join(routesDir, "hello.ts"),
      `export async function world() {}\n`,
    );
    await writeTextFile(
      join(routesDir, "crond.ts"),
      `export async function start() {}\n`,
    );
    const list = await listConsoleCommands(routesDir, "hello");
    expect(list.every((c) => c.route.startsWith("hello"))).toBe(true);
    expect(list.some((c) => c.route.startsWith("crond"))).toBe(false);
  });

  it("formatConsoleCommandList 应输出可读行", () => {
    const text = formatConsoleCommandList([
      {
        route: "hello/world",
        file: "hello.ts",
        action: "world",
        description: "Hi",
      },
    ]);
    expect(text).toContain("hello/world");
    expect(text).toContain("Hi");
  });
});
