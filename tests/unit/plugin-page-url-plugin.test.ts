/**
 * Client-bundle plugin for http(s) plugin pages.
 */

import "../setup.ts";
import {
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { pathToFileURL } from "node:url";
import { createPluginPageUrlPlugin } from "../../src/feature/plugin-page-url-plugin.ts";

type ResolveArgs = {
  path: string;
  importer?: string;
  namespace?: string;
};
type LoadArgs = { path: string };
type ResolveFn = (args: ResolveArgs) => unknown | Promise<unknown>;
type LoadFn = (args: LoadArgs) => unknown | Promise<unknown>;

function attachPlugin(extraFiles: string[]) {
  const resolvers: Array<
    { filter: RegExp; namespace?: string; fn: ResolveFn }
  > = [];
  const loaders: Array<{ filter: RegExp; namespace?: string; fn: LoadFn }> = [];
  const plugin = createPluginPageUrlPlugin(extraFiles);
  plugin.setup({
    onResolve(
      opts: { filter: RegExp; namespace?: string },
      fn: ResolveFn,
    ) {
      resolvers.push({ ...opts, fn });
    },
    onLoad(
      opts: { filter: RegExp; namespace?: string },
      fn: LoadFn,
    ) {
      loaders.push({ ...opts, fn });
    },
  } as never);
  async function resolve(args: ResolveArgs) {
    for (const r of resolvers) {
      if (r.namespace && r.namespace !== (args.namespace ?? "")) continue;
      if (!r.filter.test(args.path)) continue;
      const result = await r.fn(args);
      if (result !== undefined) return result;
    }
    return undefined;
  }
  async function load(args: LoadArgs) {
    for (const r of loaders) {
      if (r.namespace && r.namespace !== "dweb-plugin-page-url") {
        /* namespace is set on hooks */
      }
      if (!r.filter.test(args.path)) continue;
      const result = await r.fn(args);
      if (result !== undefined) return result;
    }
    return undefined;
  }
  return { plugin, resolve, load };
}

describe("plugin-page-url-plugin", () => {
  it("createPluginPageUrlPlugin returns a named setup plugin", () => {
    const plugin = createPluginPageUrlPlugin([
      "https://jsr.io/@dreamer/plugins/1.2.5/src/rbac/routes/menus/index.tsx",
    ]);
    expect(plugin.name).toBe("dweb-plugin-page-url");
    expect(typeof plugin.setup).toBe("function");
  });

  const remote = "https://example.test/@dreamer/plugins/page.tsx";
  const { resolve, load } = attachPlugin([remote]);

  it("应忽略 css 的 http 解析", async () => {
    expect(await resolve({ path: "https://example.test/a.css" }))
      .toBeUndefined();
  });

  it("未登记的 http 模块应跳过", async () => {
    expect(await resolve({ path: "https://example.test/other.tsx" }))
      .toBeUndefined();
  });

  it("已登记的 http 模块在 Deno 下应进入插件命名空间", async () => {
    expect(await resolve({ path: remote })).toEqual({
      path: remote,
      namespace: "dweb-plugin-page-url",
    });
  });

  it("命名空间内相对路径应按 importer 解析", async () => {
    const result = await resolve({
      path: "./child.tsx",
      importer: remote,
      namespace: "dweb-plugin-page-url",
    });
    expect(result).toEqual({
      path: "https://example.test/@dreamer/plugins/child.tsx",
      namespace: "dweb-plugin-page-url",
    });
  });

  it("命名空间内再遇到 http 路径应保持命名空间", async () => {
    const href = "https://example.test/other/page.tsx";
    expect(
      await resolve({
        path: href,
        importer: remote,
        namespace: "dweb-plugin-page-url",
      }),
    ).toEqual({ path: href, namespace: "dweb-plugin-page-url" });
  });

  it("命名空间内的裸包名应交给运行时解析", async () => {
    expect(
      await resolve({
        path: "preact",
        importer: remote,
        namespace: "dweb-plugin-page-url",
      }),
    ).toBeUndefined();
  });

  describe("onLoad", () => {
    let tmp: string;
    let fileHref: string;

    beforeAll(async () => {
      tmp = await makeTempDir({ prefix: "dweb-plugin-page-" });
      const file = join(tmp, "page.tsx");
      await writeTextFile(
        file,
        "export function load() { return {}; }\nexport default function Page() { return null; }\n",
      );
      fileHref = pathToFileURL(file).href;
    });

    afterAll(async () => {
      await remove(tmp, { recursive: true });
    });

    it("应从 file: URL 读取源码并按扩展名选择 loader", async () => {
      const { load: loadFile } = attachPlugin([fileHref]);
      const result = await loadFile({ path: fileHref }) as {
        contents: string;
        loader: string;
      };
      expect(result.loader).toBe("tsx");
      expect(result.contents).toContain("function Page");
    });

    it("http 拉取失败时应返回 esbuild errors", async () => {
      const server = Deno.serve(
        { hostname: "127.0.0.1", port: 0 },
        () => new Response("nope", { status: 503 }),
      );
      try {
        const addr = server.addr as Deno.NetAddr;
        const url = `http://127.0.0.1:${addr.port}/missing.tsx`;
        const { resolve: res, load: loadHttp } = attachPlugin([url]);
        expect(await res({ path: url })).toEqual({
          path: url,
          namespace: "dweb-plugin-page-url",
        });
        const result = await loadHttp({ path: url }) as {
          errors: Array<{ text: string }>;
        };
        expect(result.errors[0]?.text).toContain("Failed to fetch");
        expect(result.errors[0]?.text).toContain("503");
      } finally {
        await server.shutdown();
      }
    });

    it("http 拉取成功时应返回改写后的源码", async () => {
      const body =
        "export function load() { return { ok: 1 }; }\nexport default function Page() { return null; }\n";
      const server = Deno.serve(
        { hostname: "127.0.0.1", port: 0 },
        () =>
          new Response(body, {
            status: 200,
            headers: { "content-type": "text/tsx" },
          }),
      );
      try {
        const addr = server.addr as Deno.NetAddr;
        const url = `http://127.0.0.1:${addr.port}/page.tsx`;
        const { load: loadHttp } = attachPlugin([url]);
        const result = await loadHttp({ path: url }) as {
          contents: string;
          loader: string;
        };
        expect(result.loader).toBe("tsx");
        expect(typeof result.contents).toBe("string");
        expect(result.contents.length).toBeGreaterThan(0);
      } finally {
        await server.shutdown();
      }
    });
  });
});
