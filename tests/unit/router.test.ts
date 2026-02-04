/**
 * 路由集成测试
 *
 * 测试 src/feature/router.ts 的功能：
 * - initializeRouter 初始化路由系统
 * - getRouter 获取路由实例
 *
 * 注意：测试输出文件存放在 tests/data 目录下
 */

import {
  chdir,
  cwd,
  join,
  makeTempDir,
  mkdir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { initializePlugin } from "../../src/core/plugin.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { getRouter, initializeRouter } from "../../src/feature/router.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("路由集成 (router.ts)", () => {
  // 测试用的临时目录
  let testDir: string;
  let routesDir: string;

  beforeAll(async () => {
    // 创建临时测试目录
    testDir = await makeTempDir({ prefix: "dweb-router-test-" });
    routesDir = join(testDir, "routes");

    // 创建路由目录（使用 runtime-adapter 以兼容 Bun）
    await mkdir(routesDir, { recursive: true });

    // 创建必需的 _app.tsx 文件
    const appFile = join(routesDir, "_app.tsx");
    await writeTextFile(
      appFile,
      "export default function App({ children }: { children: unknown }) { return children; }",
    );
  });

  afterAll(async () => {
    // 清理测试目录
    await remove(testDir, { recursive: true });
  });

  describe("initializeRouter()", () => {
    it("应该创建路由实例", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const config: AppConfig = {
        router: {
          routesDir: routesDir,
        },
      };

      const router = await initializeRouter(container, config);

      expect(router).toBeDefined();
      expect(typeof router.match).toBe("function");
      expect(typeof router.getRoutes).toBe("function");
    });

    it("应该将路由注册到服务容器", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const config: AppConfig = {
        router: {
          routesDir: routesDir,
        },
      };

      const router = await initializeRouter(container, config);
      const retrievedRouter = container.get("router");

      expect(retrievedRouter).toBe(router);
    });

    it("应该使用配置中的路由目录", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const customRoutesDir = join(testDir, "custom-routes");
      await mkdir(customRoutesDir, { recursive: true });

      // 创建必需的 _app.tsx 文件
      await writeTextFile(
        join(customRoutesDir, "_app.tsx"),
        "export default function App({ children }: { children: unknown }) { return children; }",
      );

      const config: AppConfig = {
        router: {
          routesDir: customRoutesDir,
        },
      };

      const router = await initializeRouter(container, config);

      expect(router).toBeDefined();
    });

    it("应该使用渲染配置确定框架和 SSR 模式", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const config: AppConfig = {
        router: {
          routesDir: routesDir,
        },
        render: {
          engine: "react",
          mode: "ssr",
        },
      };

      const router = await initializeRouter(container, config);

      expect(router).toBeDefined();
    });

    it("应该使用默认路由目录当未配置时", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      // 创建默认路由目录
      const defaultRoutesDir = join(testDir, "src", "routes");
      await mkdir(defaultRoutesDir, { recursive: true });

      // 创建必需的 _app.tsx 文件
      await writeTextFile(
        join(defaultRoutesDir, "_app.tsx"),
        "export default function App({ children }: { children: unknown }) { return children; }",
      );

      // 更改工作目录到测试目录（使用 runtime-adapter 以兼容 Bun）
      const originalCwd = cwd();
      chdir(testDir);

      try {
        const config: AppConfig = {};
        const router = await initializeRouter(container, config);

        expect(router).toBeDefined();
      } finally {
        chdir(originalCwd);
      }
    });
  });

  describe("getRouter()", () => {
    it("应该从容器中获取路由实例", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const config: AppConfig = {
        router: {
          routesDir: routesDir,
        },
      };

      const created = await initializeRouter(container, config);
      const retrieved = getRouter(container);

      expect(retrieved).toBe(created);
    });

    it("应该在未初始化时抛出错误", () => {
      const container = initializeServiceContainer();

      expect(() => getRouter(container)).toThrow();
    });
  });

  describe("路由扫描", () => {
    it("应该扫描路由目录", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const scanRoutesDir = join(testDir, "scan-routes");
      await mkdir(scanRoutesDir, { recursive: true });

      // 创建必需的 _app.tsx 文件
      await writeTextFile(
        join(scanRoutesDir, "_app.tsx"),
        "export default function App({ children }: { children: unknown }) { return children; }",
      );

      const config: AppConfig = {
        router: {
          routesDir: scanRoutesDir,
        },
      };

      const router = await initializeRouter(container, config);
      const routes = router.getRoutes();

      expect(routes).toBeDefined();
      expect(Array.isArray(routes)).toBe(true);
    });

    it("应该扫描包含路由文件的目录", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      // 创建路由文件
      const routesDirWithFiles = join(testDir, "routes-with-files");
      await mkdir(routesDirWithFiles, { recursive: true });

      // 创建必需的 _app.tsx 文件
      await writeTextFile(
        join(routesDirWithFiles, "_app.tsx"),
        "export default function App({ children }: { children: unknown }) { return children; }",
      );

      // 创建 index.tsx 文件
      const indexFile = join(routesDirWithFiles, "index.tsx");
      await writeTextFile(
        indexFile,
        "export default function Home() { return <div>Home</div>; }",
      );

      const config: AppConfig = {
        router: {
          routesDir: routesDirWithFiles,
        },
      };

      const router = await initializeRouter(container, config);
      const routes = router.getRoutes();

      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe("API 模式配置", () => {
    it("应该支持 restful API 模式", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const apiRoutesDir = join(testDir, "api-routes-restful");
      await mkdir(apiRoutesDir, { recursive: true });
      await writeTextFile(
        join(apiRoutesDir, "_app.tsx"),
        "export default function App({ children }: { children: unknown }) { return children; }",
      );

      const config: AppConfig = {
        router: {
          routesDir: apiRoutesDir,
          apiMode: "restful",
        },
      };

      const router = await initializeRouter(container, config);

      expect(router).toBeDefined();
    });

    it("应该支持 action API 模式", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const apiRoutesDir = join(testDir, "api-routes-action");
      await mkdir(apiRoutesDir, { recursive: true });
      await writeTextFile(
        join(apiRoutesDir, "_app.tsx"),
        "export default function App({ children }: { children: unknown }) { return children; }",
      );

      const config: AppConfig = {
        router: {
          routesDir: apiRoutesDir,
          apiMode: "action",
        },
      };

      const router = await initializeRouter(container, config);

      expect(router).toBeDefined();
    });
  });
});
