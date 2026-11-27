/**
 * Plugin-provided console commands: configurable routesDir, basePath,
 * host-wins conflicts, and single-file commands.
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
import type { AppPlugin } from "../../src/types/app.ts";
import {
  collectPluginConsoleRouteRoots,
  collectPluginInlineCommands,
  listPluginConsoleCommands,
  mergeConsoleCommandLists,
  resolveConsoleRouteFromSources,
} from "../../src/feature/console-plugin-routes.ts";
import { listConsoleCommands } from "../../src/feature/console-list.ts";
import { ConsoleRouteNotFoundError } from "../../src/feature/console-router.ts";
import { invokeConsoleAction } from "../../src/feature/console-router.ts";
import type { ConsoleContext } from "../../src/feature/console-context.ts";

describe("console-plugin-routes", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await makeTempDir({ prefix: "dweb-console-plugin-routes-" });
  });

  afterEach(async () => {
    try {
      await remove(tmp, { recursive: true });
    } catch {
      // ignore
    }
  });

  function staffPlugin(
    routesDir: string,
    basePath = "staff",
  ): AppPlugin {
    return {
      name: "staff",
      version: "1.0.0",
      console: { routesDir, basePath },
    };
  }

  async function writeCommand(dir: string, name: string, body: string) {
    await ensureDir(dir);
    await writeTextFile(join(dir, name), body);
  }

  it("scans a configurable command directory (not hardcoded to routes/)", async () => {
    const commandsDir = join(tmp, "commands");
    await writeCommand(
      commandsDir,
      "hello.ts",
      `export const meta = { description: "Greet 张三" };
export function run() { console.log("你好，张三！"); }
`,
    );
    const roots = await collectPluginConsoleRouteRoots([
      staffPlugin(commandsDir),
    ]);
    expect(roots.length).toBe(1);
    expect(roots[0]!.routesDir).toBe(commandsDir);
    expect(roots[0]!.basePath).toBe("staff");
    const listed = await listPluginConsoleCommands(roots);
    expect(listed.map((c) => c.route)).toEqual(["staff/hello"]);
    expect(listed[0]!.description).toBe("Greet 张三");
  });

  it("defaults routesDir to routes when only baseDir is set", async () => {
    const baseDir = join(tmp, "plugin");
    await writeCommand(
      join(baseDir, "routes"),
      "list.ts",
      `export const meta = { description: "List 张三、李四、王五" };
export function run() { console.log("张三、李四、王五"); }
`,
    );
    const roots = await collectPluginConsoleRouteRoots([{
      name: "roster",
      version: "1.0.0",
      console: { baseDir },
    }]);
    expect(roots.length).toBe(1);
    const listed = await listPluginConsoleCommands(roots);
    expect(listed.map((c) => c.route)).toEqual(["list"]);
  });

  it("does not scan a plugin that has no console config", async () => {
    const roots = await collectPluginConsoleRouteRoots([{
      name: "http-only",
      version: "1.0.0",
    }]);
    expect(roots).toEqual([]);
  });

  it("skips a relative routesDir without baseDir (does not scan the host)", async () => {
    const roots = await collectPluginConsoleRouteRoots([{
      name: "unsafe",
      version: "1.0.0",
      console: { routesDir: "routes" },
    }]);
    expect(roots).toEqual([]);
  });

  it("host routes win when the same route exists on a plugin", async () => {
    const hostDir = join(tmp, "host");
    const pluginDir = join(tmp, "plugin-routes");
    await writeCommand(
      hostDir,
      "hello.ts",
      `export function run() { return "host-张三"; }\n`,
    );
    await writeCommand(
      pluginDir,
      "hello.ts",
      `export function run() { return "plugin-李四"; }\n`,
    );
    const roots = await collectPluginConsoleRouteRoots([{
      name: "other",
      version: "1.0.0",
      console: { routesDir: pluginDir },
    }]);
    const resolved = await resolveConsoleRouteFromSources(
      hostDir,
      "hello",
      roots,
    );
    expect(resolved.filePath).toBe(join(hostDir, "hello.ts"));
    expect(resolved.middlewareRoot).toBe(hostDir);
  });

  it("resolves a prefixed plugin command and invokes it", async () => {
    const pluginDir = join(tmp, "commands");
    await writeCommand(
      pluginDir,
      "hello.ts",
      `export function run() { return "你好，李四！"; }\n`,
    );
    const roots = await collectPluginConsoleRouteRoots([
      staffPlugin(pluginDir),
    ]);
    const resolved = await resolveConsoleRouteFromSources(
      join(tmp, "missing-host"),
      "staff/hello",
      roots,
    );
    expect(resolved.filePath).toBe(join(pluginDir, "hello.ts"));
    expect(resolved.routeName).toBe("staff/hello");
    expect(resolved.middlewareRoot).toBe(pluginDir);
    const ctx = {
      name: "staff/hello",
      args: [],
      options: {},
    } as unknown as ConsoleContext;
    const code = await invokeConsoleAction(resolved, ctx);
    expect(code).toBe(0);
  });

  it("supports a single plugin file as one command", async () => {
    const plugin: AppPlugin = {
      name: "whoami",
      version: "1.0.0",
      console: { command: "whoami" },
      meta: { description: "Print 王五" },
      run() {
        return "王五";
      },
    } as AppPlugin;
    const inline = collectPluginInlineCommands([plugin]);
    expect(inline.length).toBe(1);
    expect(inline[0]!.routeName).toBe("whoami");
    const listed = await listPluginConsoleCommands([], inline);
    expect(listed.map((c) => c.route)).toEqual(["whoami"]);
    expect(listed[0]!.description).toBe("Print 王五");
    const resolved = await resolveConsoleRouteFromSources(
      join(tmp, "missing-host"),
      "whoami",
      [],
      inline,
    );
    expect(resolved.module).toBeDefined();
    expect(resolved.routeName).toBe("whoami");
  });

  it("merges host and plugin lists with host winning on conflict", async () => {
    const hostDir = join(tmp, "host");
    const pluginDir = join(tmp, "commands");
    await writeCommand(
      hostDir,
      "list.ts",
      `export const meta = { description: "Host 张三" };
export function run() {}\n`,
    );
    await writeCommand(
      pluginDir,
      "list.ts",
      `export const meta = { description: "Plugin 李四" };
export function run() {}\n`,
    );
    const roots = await collectPluginConsoleRouteRoots([{
      name: "dup",
      version: "1.0.0",
      console: { routesDir: pluginDir },
    }]);
    const merged = mergeConsoleCommandLists(
      await listConsoleCommands(hostDir),
      await listPluginConsoleCommands(roots),
    );
    const listCmd = merged.filter((c) => c.route === "list");
    expect(listCmd.length).toBe(1);
    expect(listCmd[0]!.description).toBe("Host 张三");
  });

  it("lists only the command name when the module also exports a plugin factory", async () => {
    const filePath = join(tmp, "whoami.ts");
    await writeTextFile(
      filePath,
      `export const meta = { description: "Print 王五" };
export function run() { console.log("王五"); }
export function whoamiPlugin() { return { name: "whoami", version: "1.0.0" }; }
`,
    );
    const plugin: AppPlugin = {
      name: "whoami",
      version: "1.0.0",
      console: { command: { name: "whoami", file: filePath } },
    };
    const inline = collectPluginInlineCommands([plugin]);
    const listed = await listPluginConsoleCommands([], inline);
    expect(listed.map((c) => c.route)).toEqual(["whoami"]);
  });

  it("throws ConsoleRouteNotFoundError when neither host nor plugin has the route", async () => {
    try {
      await resolveConsoleRouteFromSources(join(tmp, "empty"), "missing");
      throw new Error("expected not found");
    } catch (err) {
      expect(err).toBeInstanceOf(ConsoleRouteNotFoundError);
    }
  });
});
