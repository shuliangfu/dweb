/**
 * Console 文件路由解析 golden 测试
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
  ConsoleActionNotFoundError,
  ConsoleRouteNotFoundError,
  invokeConsoleAction,
  resolveConsoleRoute,
  splitConsoleRoute,
} from "../../src/feature/console-router.ts";
import type { ConsoleContext } from "../../src/feature/console-context.ts";

describe("console-router", () => {
  let tmp: string;
  let routesDir: string;

  beforeEach(async () => {
    tmp = await makeTempDir({ prefix: "dweb-console-router-" });
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

  describe("splitConsoleRoute()", () => {
    it("应去掉首尾斜杠并分段", () => {
      expect(splitConsoleRoute("hello/world")).toEqual(["hello", "world"]);
      expect(splitConsoleRoute("/crond/start/")).toEqual(["crond", "start"]);
      expect(splitConsoleRoute("ping")).toEqual(["ping"]);
    });
  });

  describe("resolveConsoleRoute()", () => {
    it("聚合文件：hello.ts#world", async () => {
      await writeTextFile(
        join(routesDir, "hello.ts"),
        `export async function world() {}\n`,
      );
      const r = await resolveConsoleRoute(routesDir, "hello/world");
      expect(r.filePath).toBe(join(routesDir, "hello.ts"));
      expect(r.action).toBe("world");
      expect(r.routeName).toBe("hello/world");
    });

    it("聚合文件：crond.ts#start", async () => {
      await writeTextFile(
        join(routesDir, "crond.ts"),
        `export async function start() {}\nexport async function stop() {}\n`,
      );
      const r = await resolveConsoleRoute(routesDir, "crond/start");
      expect(r.filePath).toBe(join(routesDir, "crond.ts"));
      expect(r.action).toBe("start");
    });

    it("精确文件：cache/clear.ts → default/run/main", async () => {
      await ensureDir(join(routesDir, "cache"));
      await writeTextFile(
        join(routesDir, "cache", "clear.ts"),
        `export default async function () {}\n`,
      );
      const r = await resolveConsoleRoute(routesDir, "cache/clear");
      expect(r.filePath).toBe(join(routesDir, "cache", "clear.ts"));
      expect(r.action).toBeNull();
    });

    it("单段文件：ping.ts", async () => {
      await writeTextFile(
        join(routesDir, "ping.ts"),
        `export async function run() {}\n`,
      );
      const r = await resolveConsoleRoute(routesDir, "ping");
      expect(r.filePath).toBe(join(routesDir, "ping.ts"));
      expect(r.action).toBeNull();
    });

    it("精确文件优先于聚合方法", async () => {
      await ensureDir(join(routesDir, "hello"));
      await writeTextFile(
        join(routesDir, "hello", "world.ts"),
        `export async function run() { return 7; }\n`,
      );
      await writeTextFile(
        join(routesDir, "hello.ts"),
        `export async function world() { return 1; }\n`,
      );
      const r = await resolveConsoleRoute(routesDir, "hello/world");
      expect(r.filePath).toBe(join(routesDir, "hello", "world.ts"));
      expect(r.action).toBeNull();
    });

    it("未找到时抛 ConsoleRouteNotFoundError", async () => {
      let err: unknown;
      try {
        await resolveConsoleRoute(routesDir, "missing/action");
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(ConsoleRouteNotFoundError);
    });
  });

  describe("invokeConsoleAction()", () => {
    it("应调用聚合方法并返回 number 退出码", async () => {
      await writeTextFile(
        join(routesDir, "hello.ts"),
        `export async function world() { return 42; }\n`,
      );
      const resolved = await resolveConsoleRoute(routesDir, "hello/world");
      const code = await invokeConsoleAction(
        resolved,
        { name: "hello/world" } as ConsoleContext,
      );
      expect(code).toBe(42);
    });

    it("default 动作无返回值时退出码 0", async () => {
      await ensureDir(join(routesDir, "cache"));
      await writeTextFile(
        join(routesDir, "cache", "clear.ts"),
        `export default async function () {}\n`,
      );
      const resolved = await resolveConsoleRoute(routesDir, "cache/clear");
      const code = await invokeConsoleAction(
        resolved,
        { name: "cache/clear" } as ConsoleContext,
      );
      expect(code).toBe(0);
    });

    it("方法不存在时抛 ConsoleActionNotFoundError", async () => {
      await writeTextFile(
        join(routesDir, "hello.ts"),
        `export async function other() {}\n`,
      );
      const resolved = await resolveConsoleRoute(routesDir, "hello/world");
      let err: unknown;
      try {
        await invokeConsoleAction(
          resolved,
          { name: "hello/world" } as ConsoleContext,
        );
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(ConsoleActionNotFoundError);
    });
  });
});
