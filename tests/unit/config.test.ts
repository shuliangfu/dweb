/**
 * 配置管理模块测试
 *
 * 测试 src/core/config.ts 的功能：
 * - validateConfig 配置验证
 * - deepMergeConfig 配置合并
 * - inferConfigDirectoryFromEntry 从入口推断 config 目录
 * - 配置加载和初始化
 *
 * 错误消息断言使用中英文双匹配，因 errors.test 会 setDwebErrorTranslator(null) 导致并行时回退英文。
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { deepMergeConfig, validateConfig } from "../../src/core/config.ts";
import type { AppConfig } from "../../src/types/app.ts";

/** 中英文错误消息皆可匹配（并行测试时 translator 可能被 errors.test 清除） */
const RE = {
  name: /配置项 'name' 必须是字符串类型|Config 'name' must be a string/,
  version: /配置项 'version' 必须是字符串类型|Config 'version' must be a string/,
  envPrefix: /配置项 'envPrefix' 必须是字符串类型|Config 'envPrefix' must be a string/,
  hotReload: /配置项 'hotReload' 必须是布尔类型|Config 'hotReload' must be a boolean/,
  render: /配置项 'render' 必须是对象类型|Config 'render' must be an object/,
  renderEngine: /配置项 'render\.engine' 必须是|Config 'render\.engine' must be/,
  renderMode: /配置项 'render\.mode' 必须是|Config 'render\.mode' must be/,
  middlewares: /配置项 'middlewares' 必须是数组类型|Config 'middlewares' must be an array/,
  cannotExtractName: /无法提取名称|cannot extract name/,
  mustHaveName: /必须提供名称|must have a name/,
  mustHaveNameProp: /必须提供 name 属性|must have name property/,
  middlewareTypeInvalid: /类型无效|must be string, function or object/,
  plugins: /配置项 'plugins' 必须是数组类型|Config 'plugins' must be an array/,
  server: /配置项 'server' 必须是对象类型|Config 'server' must be an object/,
  router: /配置项 'router' 必须是对象类型|Config 'router' must be an object/,
  build: /配置项 'build' 必须是对象类型|Config 'build' must be an object/,
  logger: /配置项 'logger' 必须是对象类型|Config 'logger' must be an object/,
};

describe("配置管理 (config.ts)", () => {
  // ==================== validateConfig 测试 ====================

  describe("validateConfig()", () => {
    describe("基础配置项验证", () => {
      it("应该接受有效的基础配置", () => {
        const config: AppConfig = {
          name: "test-app",
          version: "1.0.0",
          envPrefix: "APP_",
          hotReload: true,
        };

        // 不应抛出错误
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("应该接受空配置对象", () => {
        expect(() => validateConfig({})).not.toThrow();
      });

      it("应该拒绝非字符串类型的 name", () => {
        const config = { name: 123 } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.name);
      });

      it("应该拒绝非字符串类型的 version", () => {
        const config = { version: 1.0 } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.version);
      });

      it("应该拒绝非字符串类型的 envPrefix", () => {
        const config = { envPrefix: [] } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.envPrefix);
      });

      it("应该拒绝非布尔类型的 hotReload", () => {
        const config = { hotReload: "true" } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.hotReload);
      });
    });

    describe("渲染配置验证", () => {
      it("应该接受有效的渲染配置", () => {
        const config: AppConfig = {
          render: {
            engine: "preact",
            mode: "ssr",
          },
        };
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("应该接受所有有效的 engine 值", () => {
        const engines = ["react", "preact"];
        for (const engine of engines) {
          const config: AppConfig = {
            render: { engine: engine as "react" | "preact" },
          };
          expect(() => validateConfig(config)).not.toThrow();
        }
      });

      it("应该接受所有有效的 mode 值", () => {
        const modes = ["ssr", "csr", "ssg", "hybrid"];
        for (const mode of modes) {
          const config: AppConfig = {
            render: { mode: mode as "ssr" | "csr" | "ssg" | "hybrid" },
          };
          expect(() => validateConfig(config)).not.toThrow();
        }
      });

      it("应该拒绝非对象类型的 render", () => {
        const config = { render: "invalid" } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.render);
      });

      it("应该拒绝 null 类型的 render", () => {
        const config = { render: null } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.render);
      });

      it("应该拒绝无效的 engine 值", () => {
        const config = {
          render: { engine: "angular" },
        } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.renderEngine);
      });

      it("应该拒绝无效的 mode 值", () => {
        const config = { render: { mode: "invalid" } } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.renderMode);
      });
    });

    describe("中间件配置验证", () => {
      it("应该接受字符串路径的中间件", () => {
        const config: AppConfig = {
          middlewares: ["./middlewares/auth.ts"],
        };
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("应该接受有名称的函数中间件", () => {
        const config: AppConfig = {
          middlewares: [function authMiddleware() {}],
        };
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("应该接受带 name 属性的对象中间件", () => {
        const config: AppConfig = {
          middlewares: [
            {
              middleware: () => {},
              name: "custom-middleware",
            },
          ],
        };
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("应该拒绝非数组类型的 middlewares", () => {
        const config = { middlewares: "invalid" } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.middlewares);
      });

      it("应该拒绝空路径的中间件", () => {
        const config: AppConfig = {
          middlewares: [""],
        };
        expect(() => validateConfig(config)).toThrow(RE.cannotExtractName);
      });

      it("应该拒绝匿名函数中间件", () => {
        const config: AppConfig = {
          middlewares: [() => {}],
        };
        expect(() => validateConfig(config)).toThrow(RE.mustHaveName);
      });

      it("应该拒绝没有 name 的对象中间件", () => {
        const config: AppConfig = {
          middlewares: [
            {
              middleware: () => {},
            },
          ],
        };
        expect(() => validateConfig(config)).toThrow(RE.mustHaveNameProp);
      });

      it("应该拒绝无效类型的中间件", () => {
        const config = {
          middlewares: [123],
        } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.middlewareTypeInvalid);
      });
    });

    describe("插件配置验证", () => {
      it("应该接受带 name 属性的插件对象", () => {
        const config: AppConfig = {
          plugins: [
            { name: "test-plugin", version: "1.0.0" },
          ],
        };
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("应该接受字符串路径的插件", () => {
        const config: AppConfig = {
          plugins: ["./plugins/auth.ts"],
        };
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("应该拒绝非数组类型的 plugins", () => {
        const config = { plugins: {} } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.plugins);
      });

      it("应该拒绝没有 name 的插件", () => {
        const config = {
          plugins: [{ version: "1.0.0" }],
        } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.mustHaveName);
      });
    });

    describe("其他配置项验证", () => {
      it("应该接受有效的 server 配置", () => {
        const config: AppConfig = {
          server: { port: 3000, host: "localhost" },
        };
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("应该拒绝非对象类型的 server", () => {
        const config = { server: 3000 } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.server);
      });

      it("应该接受有效的 router 配置", () => {
        const config: AppConfig = {
          router: { routesDir: "./routes" },
        };
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("应该拒绝非对象类型的 router", () => {
        const config = { router: "./routes" } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.router);
      });

      it("应该接受有效的 build 配置", () => {
        const config: AppConfig = {
          build: { validateConfig: true },
        };
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("应该拒绝非对象类型的 build", () => {
        const config = { build: true } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.build);
      });

      it("应该接受有效的 logger 配置", () => {
        const config: AppConfig = {
          logger: { level: "debug" },
        };
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("应该拒绝非对象类型的 logger", () => {
        const config = { logger: "debug" } as unknown as AppConfig;
        expect(() => validateConfig(config)).toThrow(RE.logger);
      });
    });
  });

  // ==================== deepMergeConfig 测试 ====================

  describe("deepMergeConfig()", () => {
    describe("基础合并", () => {
      it("应该合并两个简单配置对象", () => {
        const target: AppConfig = { name: "app1" };
        const source: AppConfig = { version: "1.0.0" };
        const result = deepMergeConfig(target, source);

        expect(result.name).toBe("app1");
        expect(result.version).toBe("1.0.0");
      });

      it("源配置应该覆盖目标配置的同名属性", () => {
        const target: AppConfig = { name: "app1", version: "1.0.0" };
        const source: AppConfig = { version: "2.0.0" };
        const result = deepMergeConfig(target, source);

        expect(result.name).toBe("app1");
        expect(result.version).toBe("2.0.0");
      });

      it("应该深度合并嵌套对象", () => {
        const target: AppConfig = {
          render: { engine: "preact", mode: "ssr" },
        };
        const source: AppConfig = {
          render: { mode: "csr" },
        };
        const result = deepMergeConfig(target, source);

        expect(result.render?.engine).toBe("preact");
        expect(result.render?.mode).toBe("csr");
      });

      it("应该保持原对象不变（不可变性）", () => {
        const target: AppConfig = { name: "app1" };
        const source: AppConfig = { name: "app2" };
        const result = deepMergeConfig(target, source);

        expect(target.name).toBe("app1");
        expect(result.name).toBe("app2");
      });
    });

    describe("插件数组合并", () => {
      it("应该合并不同名称的插件", () => {
        const target: AppConfig = {
          plugins: [{ name: "plugin-a", version: "1.0.0" }],
        };
        const source: AppConfig = {
          plugins: [{ name: "plugin-b", version: "1.0.0" }],
        };
        const result = deepMergeConfig(target, source);

        expect(result.plugins).toHaveLength(2);
      });

      it("应该用同名插件替换已有插件", () => {
        const target: AppConfig = {
          plugins: [{ name: "plugin-a", version: "1.0.0" }],
        };
        const source: AppConfig = {
          plugins: [{ name: "plugin-a", version: "2.0.0" }],
        };
        const result = deepMergeConfig(target, source);

        expect(result.plugins).toHaveLength(1);
        // 验证版本被更新（类型安全检查）
        const plugin = result.plugins?.[0];
        if (typeof plugin === "object" && "version" in plugin) {
          expect(plugin.version).toBe("2.0.0");
        }
      });

      it("目标为空数组时应该使用源数组", () => {
        const target: AppConfig = { plugins: undefined };
        const source: AppConfig = {
          plugins: [{ name: "plugin-a", version: "1.0.0" }],
        };
        const result = deepMergeConfig(target, source);

        expect(result.plugins).toHaveLength(1);
      });
    });

    describe("中间件数组合并", () => {
      it("应该合并不同名称的中间件", () => {
        const target: AppConfig = {
          middlewares: [{ middleware: () => {}, name: "auth" }],
        };
        const source: AppConfig = {
          middlewares: [{ middleware: () => {}, name: "logging" }],
        };
        const result = deepMergeConfig(target, source);

        expect(result.middlewares).toHaveLength(2);
      });

      it("应该用同名中间件替换已有中间件", () => {
        const newMiddleware = () => {};
        const target: AppConfig = {
          middlewares: [{ middleware: () => {}, name: "auth" }],
        };
        const source: AppConfig = {
          middlewares: [{ middleware: newMiddleware, name: "auth" }],
        };
        const result = deepMergeConfig(target, source);

        expect(result.middlewares).toHaveLength(1);
        // 验证中间件被替换
        const middleware = result.middlewares?.[0];
        if (
          typeof middleware === "object" &&
          middleware !== null &&
          "middleware" in middleware
        ) {
          expect(middleware.middleware).toBe(newMiddleware);
        }
      });

      it("应该支持字符串路径的中间件合并", () => {
        const target: AppConfig = {
          middlewares: ["./middlewares/auth.ts"],
        };
        const source: AppConfig = {
          middlewares: ["./middlewares/logging.ts"],
        };
        const result = deepMergeConfig(target, source);

        expect(result.middlewares).toHaveLength(2);
      });
    });

    describe("复杂场景", () => {
      it("应该正确处理多层嵌套配置", () => {
        const target: AppConfig = {
          name: "app",
          server: { port: 3000 },
          render: { engine: "preact", mode: "ssr" },
        };
        const source: AppConfig = {
          version: "1.0.0",
          server: { host: "localhost" },
          render: { mode: "csr" },
        };
        const result = deepMergeConfig(target, source);

        expect(result.name).toBe("app");
        expect(result.version).toBe("1.0.0");
        expect(result.server?.port).toBe(3000);
        expect(result.server?.host).toBe("localhost");
        expect(result.render?.engine).toBe("preact");
        expect(result.render?.mode).toBe("csr");
      });

      it("应该处理空配置对象", () => {
        const target: AppConfig = { name: "app" };
        const source: AppConfig = {};
        const result = deepMergeConfig(target, source);

        expect(result.name).toBe("app");
      });
    });
  });

  // ==================== inferConfigDirectoryFromEntry 测试 ====================
  // 注：inferConfigDirectoryFromEntry 依赖 Deno.mainModule / process.argv，
  // 在测试环境中 globalThis.Deno 为只读无法 mock，故跳过直接单测。
  // 该逻辑通过 build-dirs、init 等集成测试间接覆盖。
});
