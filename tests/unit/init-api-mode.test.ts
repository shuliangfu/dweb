/**
 * init apiMode 新功能测试（非旧测复跑）
 *
 * 覆盖：
 * 1) 默认 apiMode=action（菜单 API_MODES[0]）
 * 2) action＝方法式（index／create／update／remove／view）；restful＝GET／POST／PUT／DELETE
 * 3) 两种模式均生成 api 应用 routes + web 应用内 routes/api
 * 4) config 写出 router.apiMode
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  exists,
  join,
  makeTempDir,
  readTextFile,
  remove,
} from "@dreamer/runtime-adapter";
import { generate, type InitOptions } from "../../src/cmd/init.ts";
import { API_MODES } from "../../src/cmd/init/constants.ts";
import {
  listApiRouteFiles,
  listWebInAppApiRouteFiles,
} from "../../src/cmd/init/templates/api-routes.ts";
import { getConfigMainTs } from "../../src/cmd/init/templates/config.ts";
import { getFullSingleAppConfigMainTs } from "../../src/cmd/init/templates/config-full.ts";

function baseOpts(
  overrides:
    & Partial<InitOptions>
    & Pick<InitOptions, "targetDir" | "projectName">,
): InitOptions {
  return {
    appMode: "single",
    runtime: "deno",
    engine: "view",
    renderMode: "hybrid",
    style: "none",
    useSrc: true,
    exampleLevel: "with-about",
    ...overrides,
  };
}

describe("init apiMode (new)", () => {
  it("默认菜单顺序：action 在前（默认建议 action）", () => {
    expect(API_MODES[0]).toBe("action");
    expect(API_MODES).toEqual(["action", "restful"]);
  });

  it("选项文案含括号说明，Restful 无 HTTP 动词字样", async () => {
    const zh = JSON.parse(
      await Deno.readTextFile(
        new URL("../../src/locales/zh-CN.json", import.meta.url),
      ),
    );
    const en = JSON.parse(
      await Deno.readTextFile(
        new URL("../../src/locales/en-US.json", import.meta.url),
      ),
    );
    expect(zh.init.apiModeAction).toBe(
      "Action（方法式: index / create / update）",
    );
    expect(zh.init.apiModeRestful).toBe("Restful（资源）");
    expect(en.init.apiModeAction).toBe(
      "Action (method-style: index / create / update)",
    );
    expect(en.init.apiModeRestful).toBe("Restful (resource)");
    for (
      const label of [
        zh.init.apiModeRestful,
        en.init.apiModeRestful,
      ] as string[]
    ) {
      expect(label.toLowerCase()).not.toContain("http");
      expect(label).not.toContain("动词");
      expect(label.toLowerCase()).not.toContain("verb");
    }
  });

  it("listApiRouteFiles action：方法式导出，无 GET／POST 别名", () => {
    const files = listApiRouteFiles("with-about", "action");
    const byPath = Object.fromEntries(
      files.map((f) => [f.relativePath, f.content]),
    );
    expect(byPath["index.ts"]).toContain("export function index");
    expect(byPath["index.ts"]).toContain("export async function create");
    expect(byPath["index.ts"]).not.toContain("export function GET");
    expect(byPath["index.ts"]).not.toContain("export async function POST");
    expect(byPath["users/index.ts"]).toContain("export function index");
    expect(byPath["users/index.ts"]).toContain("export async function create");
    expect(byPath["users/index.ts"]).toContain("export async function update");
    expect(byPath["users/index.ts"]).toContain("export async function remove");
    expect(byPath["users/index.ts"]).toContain("body.rows");
    expect(byPath["users/[id]/view.ts"]).toContain("export function view");
    expect(byPath["users/[id].ts"]).toBeUndefined();
    expect(byPath["users/import.ts"]).toBeUndefined();
  });

  it("listApiRouteFiles restful：现行 HTTP 动词模板", () => {
    const files = listApiRouteFiles("with-about", "restful");
    const byPath = Object.fromEntries(
      files.map((f) => [f.relativePath, f.content]),
    );
    expect(byPath["index.ts"]).toContain("export function GET");
    expect(byPath["index.ts"]).toContain("export async function POST");
    expect(byPath["index.ts"]).not.toContain("export function index");
    expect(byPath["users/index.ts"]).toContain("export function GET");
    expect(byPath["users/index.ts"]).toContain("export async function POST");
    expect(byPath["users/[id].ts"]).toContain("export function GET");
    expect(byPath["users/[id].ts"]).toContain("export async function PUT");
    expect(byPath["users/[id].ts"]).toContain("export function DELETE");
    expect(byPath["users/import.ts"]).toContain("export async function POST");
    expect(byPath["users/[id]/view.ts"]).toBeUndefined();
  });

  it("listWebInAppApiRouteFiles：两种模式都落在 api/ 前缀", () => {
    const action = listWebInAppApiRouteFiles("minimal", "action");
    const restful = listWebInAppApiRouteFiles("minimal", "restful");
    expect(action.every((f) => f.relativePath.startsWith("api/"))).toBe(true);
    expect(restful.every((f) => f.relativePath.startsWith("api/"))).toBe(true);
    expect(action[0]?.relativePath).toBe("api/index.ts");
    expect(restful[0]?.relativePath).toBe("api/index.ts");
    expect(action[0]?.content).toContain("export function index");
    expect(restful[0]?.content).toContain("export function GET");
  });

  it("config 模板写出 router.apiMode（单应用 api／web + 多应用覆盖）", () => {
    const apiOpts = baseOpts({
      targetDir: "/tmp/x",
      projectName: "demo-api",
      kind: "api",
      apps: [{ name: "demo-api", kind: "api" }],
      apiMode: "action",
    });
    const apiFull = getFullSingleAppConfigMainTs(apiOpts, "api");
    expect(apiFull).toContain('apiMode: "action"');

    const webOpts = baseOpts({
      targetDir: "/tmp/x",
      projectName: "demo-web",
      apiMode: "restful",
      engine: "preact",
      style: "tailwind",
    });
    const webFull = getFullSingleAppConfigMainTs(webOpts, "web");
    expect(webFull).toContain('apiMode: "restful"');

    const multiApi = getConfigMainTs(
      baseOpts({
        targetDir: "/tmp/x",
        projectName: "mixed",
        appMode: "multi",
        apps: [
          { name: "web", kind: "web" },
          { name: "api", kind: "api" },
        ],
        apiMode: "action",
      }),
      "api",
      3001,
      "api",
    );
    expect(multiApi).toContain('apiMode: "action"');

    const multiWeb = getConfigMainTs(
      baseOpts({
        targetDir: "/tmp/x",
        projectName: "mixed",
        appMode: "multi",
        apps: [
          { name: "web", kind: "web" },
          { name: "api", kind: "api" },
        ],
        apiMode: "restful",
        engine: "preact",
      }),
      "web",
      3000,
      "web",
    );
    expect(multiWeb).toContain('apiMode: "restful"');
  });

  it(
    "generate action：api 应用方法式 + web 应用内 api，config 为 action",
    async () => {
      const parentDir = await makeTempDir({
        prefix: "dweb-init-apimode-action-",
      });
      const apiDir = join(parentDir, "api-action");
      const webDir = join(parentDir, "web-action");

      await generate(baseOpts({
        targetDir: apiDir,
        projectName: "api-action",
        kind: "api",
        apps: [{ name: "api-action", kind: "api" }],
        apiMode: "action",
      }));
      await generate(baseOpts({
        targetDir: webDir,
        projectName: "web-action",
        apiMode: "action",
        engine: "preact",
        style: "none",
      }));

      const indexFile = await readTextFile(
        join(apiDir, "src", "routes", "index.ts"),
      );
      expect(indexFile).toContain("export function index");
      expect(indexFile).not.toContain("export function GET");
      expect(await exists(join(apiDir, "src", "routes", "users", "index.ts")))
        .toBe(true);
      expect(
        await exists(join(apiDir, "src", "routes", "users", "[id]", "view.ts")),
      ).toBe(true);
      const apiCfg = await readTextFile(
        join(apiDir, "src", "config", "main.ts"),
      );
      expect(apiCfg).toContain('apiMode: "action"');

      expect(await exists(join(webDir, "src", "routes", "api", "index.ts")))
        .toBe(true);
      expect(
        await exists(join(webDir, "src", "routes", "api", "users", "index.ts")),
      ).toBe(true);
      const webIndex = await readTextFile(
        join(webDir, "src", "routes", "api", "index.ts"),
      );
      expect(webIndex).toContain("export function index");
      const webCfg = await readTextFile(
        join(webDir, "src", "config", "main.ts"),
      );
      expect(webCfg).toContain('apiMode: "action"');

      await remove(parentDir, { recursive: true });
    },
    { timeout: 30_000 },
  );

  it(
    "generate restful：api 应用 HTTP 动词 + web 应用内 api，config 为 restful",
    async () => {
      const parentDir = await makeTempDir({
        prefix: "dweb-init-apimode-restful-",
      });
      const apiDir = join(parentDir, "api-restful");
      const webDir = join(parentDir, "web-restful");

      await generate(baseOpts({
        targetDir: apiDir,
        projectName: "api-restful",
        kind: "api",
        apps: [{ name: "api-restful", kind: "api" }],
        apiMode: "restful",
      }));
      await generate(baseOpts({
        targetDir: webDir,
        projectName: "web-restful",
        apiMode: "restful",
        engine: "preact",
        style: "none",
      }));

      const indexFile = await readTextFile(
        join(apiDir, "src", "routes", "index.ts"),
      );
      expect(indexFile).toContain("export function GET");
      expect(indexFile).not.toContain("export function index");
      expect(await exists(join(apiDir, "src", "routes", "users", "[id].ts")))
        .toBe(true);
      expect(await exists(join(apiDir, "src", "routes", "users", "import.ts")))
        .toBe(true);
      const apiCfg = await readTextFile(
        join(apiDir, "src", "config", "main.ts"),
      );
      expect(apiCfg).toContain('apiMode: "restful"');

      expect(await exists(join(webDir, "src", "routes", "api", "index.ts")))
        .toBe(true);
      const webIndex = await readTextFile(
        join(webDir, "src", "routes", "api", "index.ts"),
      );
      expect(webIndex).toContain("export function GET");
      const webCfg = await readTextFile(
        join(webDir, "src", "config", "main.ts"),
      );
      expect(webCfg).toContain('apiMode: "restful"');

      await remove(parentDir, { recursive: true });
    },
    { timeout: 30_000 },
  );
});
