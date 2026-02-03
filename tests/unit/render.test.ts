/**
 * 渲染集成测试
 *
 * 测试 src/feature/render.ts 的功能：
 * - initializeRender 初始化渲染引擎
 * - getRender 获取渲染服务
 * - renderSSR、renderSSG 方法存在且可调用
 *
 * 注意：实际渲染逻辑在 @dreamer/render 库中完成，
 * 此处仅测试 dweb 框架的集成正确性。CSR 由 feature 层其它模块处理，不在此服务中暴露。
 */

import { describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { getRender, initializeRender } from "../../src/feature/render.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("渲染集成 (render.ts)", () => {
  describe("initializeRender()", () => {
    it("应该初始化渲染服务并包含 renderSSR 与 renderSSG", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);

      const renderService = getRender(container);
      expect(renderService).toBeDefined();
      expect(typeof renderService.renderSSR).toBe("function");
      expect(typeof renderService.renderSSG).toBe("function");
    });

    it("应该将渲染服务注册为单例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);

      const renderService1 = getRender(container);
      const renderService2 = getRender(container);
      expect(renderService1).toBe(renderService2);
    });

    it("多次调用应抛出错误（服务已注册）", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);

      expect(() => initializeRender(container, config)).toThrow("已注册");
    });
  });

  describe("getRender()", () => {
    it("应从容器中获取渲染服务并包含 renderSSR、renderSSG", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      expect(renderService).toBeDefined();
      expect(typeof renderService.renderSSR).toBe("function");
      expect(typeof renderService.renderSSG).toBe("function");
    });

    it("未初始化时调用应抛出错误", () => {
      const container = initializeServiceContainer();

      expect(() => getRender(container)).toThrow();
    });
  });

  describe("renderSSR 方法", () => {
    it("应为函数且调用后返回 Promise", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      expect(typeof renderService.renderSSR).toBe("function");

      const result = renderService.renderSSR({
        engine: "preact",
        component: null as unknown as Parameters<
          typeof renderService.renderSSR
        >[0]["component"],
      });
      expect(result).toBeInstanceOf(Promise);

      const resolved = await result;
      expect(resolved).toBeDefined();
      expect(resolved).toHaveProperty("html");
      expect(typeof resolved.html).toBe("string");
    });

    it("应使用配置中的 engine 作为默认值", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = { render: { engine: "preact" } };

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = renderService.renderSSR({
        engine: "preact",
        component: null as unknown as Parameters<
          typeof renderService.renderSSR
        >[0]["component"],
      });
      const resolved = await result;
      expect(resolved).toHaveProperty("html");
      expect(typeof resolved.html).toBe("string");
    });
  });

  describe("renderSSG 方法", () => {
    it("应为函数", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      expect(typeof renderService.renderSSG).toBe("function");
    });

    it("调用后应返回 Promise<string[]>", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = renderService.renderSSG(
        {
          engine: "preact",
          routes: [],
          outputDir: "",
          loadRouteComponent: async () => ({}),
        } as Parameters<typeof renderService.renderSSG>[0],
      );
      expect(result).toBeInstanceOf(Promise);

      const resolved = await result;
      expect(Array.isArray(resolved)).toBe(true);
    });
  });

  describe("渲染引擎配置", () => {
    it("配置 react 引擎时服务应正常初始化", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        render: { engine: "react" },
      };

      initializeRender(container, config);
      const renderService = getRender(container);

      expect(typeof renderService.renderSSR).toBe("function");
      expect(typeof renderService.renderSSG).toBe("function");
    });

    it("配置 preact 引擎时服务应正常初始化", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        render: { engine: "preact" },
      };

      initializeRender(container, config);
      const renderService = getRender(container);

      expect(typeof renderService.renderSSR).toBe("function");
      expect(typeof renderService.renderSSG).toBe("function");
    });
  });

  describe("渲染模式配置", () => {
    it("配置 ssr 模式时服务应正常初始化", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        render: { mode: "ssr" },
      };

      initializeRender(container, config);
      const renderService = getRender(container);

      expect(typeof renderService.renderSSR).toBe("function");
      expect(typeof renderService.renderSSG).toBe("function");
    });

    it("配置 csr 模式时服务应正常初始化", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        render: { mode: "csr" },
      };

      initializeRender(container, config);
      const renderService = getRender(container);

      expect(typeof renderService.renderSSR).toBe("function");
      expect(typeof renderService.renderSSG).toBe("function");
    });

    it("配置 ssg 模式时服务应正常初始化", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        render: { mode: "ssg" },
      };

      initializeRender(container, config);
      const renderService = getRender(container);

      expect(typeof renderService.renderSSG).toBe("function");
      expect(typeof renderService.renderSSR).toBe("function");
    });
  });
});
