/**
 * CSR 客户端路由 manifest 测试。
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  ensureDir,
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import type { Router } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import { describe, expect, it } from "@dreamer/test";
import {
  collectRouteClientManifestFromRouter,
  getRouteClientManifest,
} from "../../src/feature/csr-client-route-manifest.ts";

describe("CSR 客户端路由 manifest (csr-client-route-manifest.ts)", () => {
  it("应优先使用 fullPath 收集组件，避免相对 file 导致 index 丢失", () => {
    const routesDirPath = "/project/src/routes";
    const router = {
      getRoutes: () => [
        {
          path: "/",
          file: "index.tsx",
          fullPath: join(routesDirPath, "index.tsx"),
          isApi: false,
          isSpecial: false,
        },
      ],
      getLayoutKeysForPath: () => [],
    } as unknown as Router;

    const manifest = collectRouteClientManifestFromRouter(
      router,
      routesDirPath,
    );

    expect(manifest.components.length).toBe(1);
    expect(manifest.components[0].componentPath).toBe("index");
    expect(manifest.components[0].importName).toBe("Route_index");
  });

  it("应支持 fullPath 为相对项目根路径的 Router 输出", async () => {
    const originalCwd = cwd();
    const projectRoot = await makeTempDir({ prefix: "dweb-route-manifest-" });
    await ensureDir(join(projectRoot, "src", "routes"));
    chdir(projectRoot);
    try {
      const routesDirPath = join(projectRoot, "src", "routes");
      const router = {
        getRoutes: () => [
          {
            path: "/",
            file: "index.tsx",
            fullPath: "src/routes/index.tsx",
            isApi: false,
            isSpecial: false,
          },
        ],
        getLayoutKeysForPath: () => [],
      } as unknown as Router;

      const manifest = collectRouteClientManifestFromRouter(
        router,
        routesDirPath,
      );

      expect(manifest.components.length).toBe(1);
      expect(manifest.components[0].componentPath).toBe("index");
      expect(manifest.components[0].fullPath).toBe(
        join(projectRoot, "src", "routes", "index.tsx"),
      );
    } finally {
      chdir(originalCwd);
      await remove(projectRoot, { recursive: true });
    }
  });

  it("Windows: Router fullPath 为 D: 盘绝对路径时 componentPath 须为相对 routes 段，避免 D:/ 误入 ROUTE_LOADERS key", () => {
    const routesDirPath =
      "D:/a/dweb/dweb/examples/preact-ssr/advanced/src/frontend/routes";
    const aboutPath = `${routesDirPath}/about.tsx`;
    const router = {
      getRoutes: () => [
        {
          path: "/about",
          file: "about.tsx",
          fullPath: aboutPath,
          isApi: false,
          isSpecial: false,
        },
      ],
      getLayoutKeysForPath: () => [],
    } as unknown as Router;

    const manifest = collectRouteClientManifestFromRouter(
      router,
      routesDirPath,
    );

    expect(manifest.components.length).toBe(1);
    expect(manifest.components[0].componentPath).toBe("about");
    expect(manifest.components[0].componentPath).not.toMatch(/[A-Z]:\//);
  });

  it("getRouteClientManifest 应合并目录 walk，保证磁盘上的页面进入 ROUTE_LOADERS", async () => {
    const projectRoot = await makeTempDir({
      prefix: "dweb-route-manifest-fs-",
    });
    const routesDirPath = join(projectRoot, "routes");
    await ensureDir(routesDirPath);
    await writeTextFile(
      join(routesDirPath, "index.tsx"),
      "export default function Page() { return null; }\n",
    );
    await writeTextFile(
      join(routesDirPath, "about.tsx"),
      "export default function About() { return null; }\n",
    );
    try {
      const manifest = await getRouteClientManifest(
        {} as ServiceContainer,
        routesDirPath,
        "preact",
      );
      const keys = manifest.components.map((c) => c.componentPath).sort();
      expect(keys).toEqual(["about", "index"]);
    } finally {
      await remove(projectRoot, { recursive: true });
    }
  });
});
