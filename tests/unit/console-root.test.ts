/**
 * resolveConsoleRoot 单元测试
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
import { resolveConsoleRoot } from "../../src/utils/console-root.ts";

describe("resolveConsoleRoot()", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await makeTempDir({ prefix: "dweb-console-root-" });
  });

  afterEach(async () => {
    try {
      await remove(tmp, { recursive: true });
    } catch {
      // ignore
    }
  });

  it("单应用（无 deno multi tasks）：返回项目根或 src/", async () => {
    await ensureDir(join(tmp, "config"));
    await writeTextFile(
      join(tmp, "deno.json"),
      JSON.stringify({
        tasks: { "run:hello": "echo hi" },
      }),
    );
    const root = await resolveConsoleRoot(tmp);
    expect(root).toBe(tmp);
  });

  it("单应用 + useSrc：返回 src/", async () => {
    await ensureDir(join(tmp, "src", "config"));
    await writeTextFile(
      join(tmp, "deno.json"),
      JSON.stringify({ tasks: { "run:hello": "echo hi" } }),
    );
    const root = await resolveConsoleRoot(tmp);
    expect(root).toBe(join(tmp, "src"));
  });

  it("多应用：默认 console/", async () => {
    await ensureDir(join(tmp, "console", "routes"));
    await ensureDir(join(tmp, "web", "routes"));
    await writeTextFile(
      join(tmp, "deno.json"),
      JSON.stringify({
        tasks: {
          "dev:web": "deno run -A web/main.ts --dev",
          "build:web": "deno run -A web/main.ts --build",
          "start:web": "deno run -A dist/web/server.js --start",
        },
      }),
    );
    const root = await resolveConsoleRoot(tmp);
    expect(root).toBe(join(tmp, "console"));
  });

  it("多应用 + useSrc：src/console/", async () => {
    await ensureDir(join(tmp, "src", "console", "config"));
    await writeTextFile(
      join(tmp, "deno.json"),
      JSON.stringify({
        tasks: {
          "dev:web": "deno run -A src/web/main.ts --dev",
          "build:web": "deno run -A src/web/main.ts --build",
        },
      }),
    );
    const root = await resolveConsoleRoot(tmp);
    expect(root).toBe(join(tmp, "src", "console"));
  });

  it("多应用无 console 目录时应抛错", async () => {
    await ensureDir(join(tmp, "web", "routes"));
    await writeTextFile(
      join(tmp, "deno.json"),
      JSON.stringify({
        tasks: {
          "dev:web": "deno run -A web/main.ts --dev",
          "build:web": "deno run -A web/main.ts --build",
        },
      }),
    );
    let threw = false;
    try {
      await resolveConsoleRoot(tmp);
    } catch (e) {
      threw = true;
      expect(e instanceof Error).toBe(true);
      expect((e as Error).message).toMatch(/not found/i);
    }
    expect(threw).toBe(true);
  });

  it("显式 consoleDir 覆盖", async () => {
    const custom = join(tmp, "cli-app");
    await ensureDir(custom);
    const root = await resolveConsoleRoot(tmp, { consoleDir: custom });
    expect(root).toBe(custom);
  });
});
