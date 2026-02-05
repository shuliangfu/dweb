/**
 * 构建集成测试
 *
 * 测试 src/feature/build.ts 的功能：
 * - initializeBuild 初始化构建工具
 * - getBuild 获取构建器实例
 * - 构建器的各种配置和方法
 *
 * 注意：测试输出文件存放在 tests/data 目录下
 */

import "../setup.ts";
import { chdir, cwd, dirname, readdir, stat } from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";

/** 将 file: URL 转为本地路径（Bun 下避免 cwd 被 db/generate 测试污染） */
function fromFileUrl(url: string): string {
  const u = new URL(url);
  if (u.protocol !== "file:") return url;
  let p = decodeURIComponent(u.pathname);
  if (p.length >= 3 && /^\/[A-Za-z]:\//.test(p)) p = p.slice(1);
  return p;
}
import { initializeServiceContainer } from "../../src/core/service.ts";
import { getBuild, initializeBuild } from "../../src/feature/build.ts";
import type { AppConfig } from "../../src/types/app.ts";
import { initializeLogger } from "../../src/utils/logger.ts";

describe("构建集成 (build.ts)", () => {
  // 辅助函数：创建带 logger 的测试环境
  function createTestEnv(config: AppConfig = {}) {
    const container = initializeServiceContainer();
    initializeLogger(container, config);
    return container;
  }

  describe("initializeBuild()", () => {
    it("应该创建构建器实例并包含 build 方法", () => {
      const container = createTestEnv();
      const config: AppConfig = {};

      const builder = initializeBuild(container, config);

      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe("function");
      expect(typeof builder.buildServer).toBe("function");
      expect(typeof builder.buildClient).toBe("function");
    });

    it("应该将构建器注册为单例", () => {
      const container = createTestEnv();
      const config: AppConfig = {};

      const builder = initializeBuild(container, config);
      const retrieved1 = getBuild(container);
      const retrieved2 = getBuild(container);

      expect(retrieved1).toBe(builder);
      expect(retrieved2).toBe(builder);
    });

    it("多次调用会抛出错误（服务已注册）", () => {
      const container = createTestEnv();
      const config: AppConfig = {};

      initializeBuild(container, config);

      expect(() => initializeBuild(container, config)).toThrow("已注册");
    });
  });

  describe("getBuild()", () => {
    it("应该从容器中获取相同的构建器实例", () => {
      const container = createTestEnv();
      const config: AppConfig = {};

      const created = initializeBuild(container, config);
      const retrieved = getBuild(container);

      expect(retrieved).toBe(created);
    });

    it("应该在未初始化时抛出错误", () => {
      const container = createTestEnv();

      expect(() => getBuild(container)).toThrow();
    });
  });

  describe("构建器方法", () => {
    it("build 方法应返回 Promise", async () => {
      const container = createTestEnv();
      const config: AppConfig = {
        build: {
          client: {
            engine: "preact",
            output: "./tests/data/build-output",
          },
        },
      };

      const builder = initializeBuild(container, config);

      // build 方法应该返回 Promise
      const result = builder.build();
      expect(result).toBeInstanceOf(Promise);

      // 等待完成（可能会因缺少入口文件而失败）
      try {
        await result;
      } catch {
        // 预期会失败，因为没有真实的入口文件
      }
    });

    it("buildServer 未配置时应抛出错误", async () => {
      const container = createTestEnv();
      const config: AppConfig = {};

      const builder = initializeBuild(container, config);

      // 未配置服务端构建应该抛出错误
      let errorThrown = false;
      let errorMessage = "";
      try {
        await builder.buildServer();
      } catch (error) {
        errorThrown = true;
        errorMessage = (error as Error).message;
      }

      expect(errorThrown).toBe(true);
      expect(errorMessage).toContain("未配置服务端构建");
    });

    it("buildClient 未配置时应抛出错误", async () => {
      const container = createTestEnv();
      const config: AppConfig = {};

      const builder = initializeBuild(container, config);

      // 未配置客户端构建应该抛出错误
      let errorThrown = false;
      let errorMessage = "";
      try {
        await builder.buildClient();
      } catch (error) {
        errorThrown = true;
        errorMessage = (error as Error).message;
      }

      expect(errorThrown).toBe(true);
      expect(errorMessage).toContain("未配置客户端构建");
    });
  });

  describe("服务端配置", () => {
    it("配置服务端后 buildServer 方法应该可用", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        build: {
          server: {
            entry: "./tests/data/server-entry.ts",
            output: "./tests/data/server-output",
          },
        },
      };

      const builder = initializeBuild(container, config);

      // buildServer 应该是一个函数
      expect(typeof builder.buildServer).toBe("function");
    });
  });

  describe("客户端配置", () => {
    it("配置客户端后 buildClient 方法应该可用", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        build: {
          client: {
            engine: "preact",
            output: "./tests/data/client-output",
          },
        },
      };

      const builder = initializeBuild(container, config);

      // buildClient 应该是一个函数
      expect(typeof builder.buildClient).toBe("function");
    });

    it("配置不同引擎应该正常创建", () => {
      const engines = ["preact", "react"] as const;

      for (const engine of engines) {
        const container = createTestEnv();
        const config: AppConfig = {
          build: {
            client: {
              engine,
              output: "./tests/data/client-output",
            },
          },
        };

        const builder = initializeBuild(container, config);

        expect(builder).toBeDefined();
        expect(typeof builder.buildClient).toBe("function");
      }
    });
  });

  describe("构建选项配置", () => {
    it("配置 dev 模式应正常创建构建器", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        build: {
          build: { mode: "dev" },
          client: { engine: "preact", output: "./dist" },
        },
      };

      const builder = initializeBuild(container, config);

      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe("function");
    });

    it("配置 prod 模式应正常创建构建器", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        build: {
          build: { mode: "prod" },
          client: { engine: "preact", output: "./dist" },
        },
      };

      const builder = initializeBuild(container, config);

      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe("function");
    });

    it("配置缓存选项应正常创建构建器", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        build: {
          build: { cache: true },
          client: { engine: "preact", output: "./dist" },
        },
      };

      const builder = initializeBuild(container, config);

      expect(builder).toBeDefined();
    });

    it("配置增量构建应正常创建构建器", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        build: {
          build: { incremental: true },
          client: { engine: "preact", output: "./dist" },
        },
      };

      const builder = initializeBuild(container, config);

      expect(builder).toBeDefined();
    });

    it("配置静默模式应正常创建构建器", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        build: {
          build: { silent: true },
          client: { engine: "preact", output: "./dist" },
        },
      };

      const builder = initializeBuild(container, config);

      expect(builder).toBeDefined();
    });
  });

  describe("渲染引擎集成", () => {
    it("从 render 配置推断客户端引擎", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        render: { engine: "react" },
      };

      const builder = initializeBuild(container, config);

      // 应该正常创建（会从 render.engine 推断客户端配置）
      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe("function");
    });
  });

  describe(
    "实际构建输出",
    () => {
      let originalCwd: string;
      let projectRoot: string;

      beforeAll(() => {
        originalCwd = cwd();
        const testFilePath = fromFileUrl(import.meta.url);
        projectRoot = dirname(dirname(dirname(testFilePath)));
        chdir(projectRoot);
      });

      afterAll(() => {
        chdir(originalCwd);
      });

      it("应该构建服务端入口并生成输出文件", async () => {
        const container = createTestEnv();
        const config: AppConfig = {
          build: {
            server: {
              entry: "./tests/data/server-entry.ts",
              output: "./tests/data/server-output",
            },
          },
        };

        const builder = initializeBuild(container, config);

        // 执行服务端构建
        await builder.buildServer();

        // 验证输出目录存在（使用 runtime-adapter 以兼容 Bun）
        const outputDir = "./tests/data/server-output";
        const dirInfo = await stat(outputDir);
        expect(dirInfo.isDirectory).toBe(true);

        // 验证有输出文件
        const files: string[] = [];
        const entries = await readdir(outputDir);
        for (const entry of entries) {
          files.push(entry.name);
        }
        expect(files.length).toBeGreaterThan(0);

        console.log("服务端构建输出文件:", files);
      });

      it("应该构建客户端入口并生成输出文件", async () => {
        const container = createTestEnv();
        const config: AppConfig = {
          build: {
            client: {
              engine: "preact",
              entry: "./tests/data/client-entry.tsx",
              output: "./tests/data/client-output",
            },
          },
        };

        const builder = initializeBuild(container, config);

        // 执行客户端构建
        await builder.buildClient();

        // 验证输出目录存在（使用 runtime-adapter 以兼容 Bun）
        const outputDir = "./tests/data/client-output";
        const dirInfo = await stat(outputDir);
        expect(dirInfo.isDirectory).toBe(true);

        // 验证有输出文件
        const files: string[] = [];
        const entries = await readdir(outputDir);
        for (const entry of entries) {
          files.push(entry.name);
        }
        expect(files.length).toBeGreaterThan(0);

        console.log("客户端构建输出文件:", files);
      }, { timeout: 30000 });

      it("应该同时构建服务端和客户端", async () => {
        const container = createTestEnv();
        const config: AppConfig = {
          build: {
            server: {
              entry: "./tests/data/server-entry.ts",
              output: "./tests/data/server-output",
            },
            client: {
              engine: "preact",
              entry: "./tests/data/client-entry.tsx",
              output: "./tests/data/client-output",
            },
          },
        };

        const builder = initializeBuild(container, config);

        // 执行完整构建
        await builder.build();

        // 验证服务端输出（使用 runtime-adapter 以兼容 Bun）
        const serverFiles: string[] = [];
        const serverEntries = await readdir("./tests/data/server-output");
        for (const entry of serverEntries) {
          serverFiles.push(entry.name);
        }
        expect(serverFiles.length).toBeGreaterThan(0);

        // 验证客户端输出
        const clientFiles: string[] = [];
        const clientEntries = await readdir("./tests/data/client-output");
        for (const entry of clientEntries) {
          clientFiles.push(entry.name);
        }
        expect(clientFiles.length).toBeGreaterThan(0);

        console.log("服务端输出:", serverFiles);
        console.log("客户端输出:", clientFiles);
      }, { timeout: 30000 });
    },
    { sanitizeOps: false, sanitizeResources: false },
  );
});
