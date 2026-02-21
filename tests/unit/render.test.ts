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

import "../setup.ts";
import { cwd, dirname, join, remove } from "@dreamer/runtime-adapter";
import { afterAll, assertRejects, describe, expect, it } from "@dreamer/test";
import { type ComponentChildren, createElement } from "preact";
import { createElement as createElementReact } from "react";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { getRender, initializeRender } from "../../src/feature/render.ts";
import type { AppConfig } from "../../src/types/app.ts";

/** Preact 最小有效组件，用于 renderSSR 集成测试（@dreamer/render 1.0.8+ 不接受 null，需传入有效组件） */
function MinimalPreactComponent() {
  return createElement("div", null, "ok");
}

/** React 最小有效组件，用于 renderSSR 集成测试 */
function MinimalReactComponent() {
  return createElementReact("div", null, "ok");
}

/** 带 props 的 Preact 组件 */
function PreactWithProps(
  { msg }: { msg?: string },
) {
  return createElement("div", null, msg ?? "default");
}

/** 带 props 的 React 组件 */
function ReactWithProps(
  { msg }: { msg?: string },
) {
  return createElementReact("div", null, msg ?? "default");
}

describe("渲染集成 (render.ts)", () => {
  afterAll(async () => {
    const root = dirname(dirname(import.meta.dirname ?? "."));
    const outputDir = join(root, "tests", "data", "render-ssg-out");
    try {
      await remove(outputDir, { recursive: true });
    } catch {
      // 目录不存在或已删除，忽略
    }
  });

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
    it("Preact：应为函数且调用后返回 Promise", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      expect(typeof renderService.renderSSR).toBe("function");

      const result = renderService.renderSSR({
        engine: "preact",
        component: MinimalPreactComponent,
      });
      expect(result).toBeInstanceOf(Promise);

      const resolved = await result;
      expect(resolved).toBeDefined();
      expect(resolved).toHaveProperty("html");
      expect(typeof resolved.html).toBe("string");
    });

    it("React：应为函数且调用后返回 Promise", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      expect(typeof renderService.renderSSR).toBe("function");

      const result = renderService.renderSSR({
        engine: "react",
        component: MinimalReactComponent,
      });
      expect(result).toBeInstanceOf(Promise);

      const resolved = await result;
      expect(resolved).toBeDefined();
      expect(resolved).toHaveProperty("html");
      expect(typeof resolved.html).toBe("string");
    });

    it("Preact：应使用配置中的 engine 作为默认值", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = { render: { engine: "preact" } };

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = renderService.renderSSR({
        engine: "preact",
        component: MinimalPreactComponent,
      });
      const resolved = await result;
      expect(resolved).toHaveProperty("html");
      expect(typeof resolved.html).toBe("string");
    });

    it("React：应使用配置中的 engine 作为默认值", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = { render: { engine: "react" } };

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = renderService.renderSSR({
        engine: "react",
        component: MinimalReactComponent,
      });
      const resolved = await result;
      expect(resolved).toHaveProperty("html");
      expect(typeof resolved.html).toBe("string");
    });

    it("Preact 引擎应正确渲染", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR({
        engine: "preact",
        component: MinimalPreactComponent,
      });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("html");
      expect(typeof result.html).toBe("string");
      expect(result.html).toContain("ok");
    });

    it("React 引擎应正确渲染", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR({
        engine: "react",
        component: MinimalReactComponent,
      });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("html");
      expect(typeof result.html).toBe("string");
      expect(result.html).toContain("ok");
    });

    it("Preact：component 为 null 时应抛出异常", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      await assertRejects(
        async () =>
          renderService.renderSSR({
            engine: "preact",
            component: null as unknown as Parameters<
              typeof renderService.renderSSR
            >[0]["component"],
          }),
      );
    });

    it("React：component 为 null 时应抛出异常", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      await assertRejects(
        async () =>
          renderService.renderSSR({
            engine: "react",
            component: null as unknown as Parameters<
              typeof renderService.renderSSR
            >[0]["component"],
          }),
      );
    });

    it("Preact：component 为 undefined 时应抛出异常", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      await assertRejects(
        async () =>
          renderService.renderSSR({
            engine: "preact",
            component: undefined as unknown as Parameters<
              typeof renderService.renderSSR
            >[0]["component"],
          }),
      );
    });

    it("React：component 为 undefined 时应抛出异常", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      await assertRejects(
        async () =>
          renderService.renderSSR({
            engine: "react",
            component: undefined as unknown as Parameters<
              typeof renderService.renderSSR
            >[0]["component"],
          }),
      );
    });

    it("Preact：不传 engine 时应使用 config 默认值 preact", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = { render: { engine: "preact" } };

      initializeRender(container, config);
      const renderService = getRender(container);

      // 不传 engine，应使用 config 的 preact
      const result = await renderService.renderSSR(
        {
          component: MinimalPreactComponent,
        } as Parameters<typeof renderService.renderSSR>[0],
      );
      expect(result).toBeDefined();
      expect(result.html).toContain("ok");
    });

    it("React：不传 engine 时应使用 config 默认值 react", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = { render: { engine: "react" } };

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR(
        {
          component: MinimalReactComponent,
        } as Parameters<typeof renderService.renderSSR>[0],
      );
      expect(result).toBeDefined();
      expect(result.html).toContain("ok");
    });

    it("Preact：带 props 时应正确渲染", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR({
        engine: "preact",
        component: PreactWithProps,
        props: { msg: "hello" },
      });
      expect(result).toBeDefined();
      expect(result.html).toContain("hello");
    });

    it("React：带 props 时应正确渲染", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR({
        engine: "react",
        component: ReactWithProps,
        props: { msg: "world" },
      });
      expect(result).toBeDefined();
      expect(result.html).toContain("world");
    });

    it("Preact：props 为空对象时应使用组件默认值", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR({
        engine: "preact",
        component: PreactWithProps,
        props: {},
      });
      expect(result).toBeDefined();
      expect(result.html).toContain("default");
    });

    it("React：props 为空对象时应使用组件默认值", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR({
        engine: "react",
        component: ReactWithProps,
        props: {},
      });
      expect(result).toBeDefined();
      expect(result.html).toContain("default");
    });

    it("Preact：skipLayouts 时布局应被跳过", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR({
        engine: "preact",
        component: MinimalPreactComponent,
        skipLayouts: true,
      });
      expect(result).toBeDefined();
      expect(result.html).toContain("ok");
    });

    it("React：skipLayouts 时布局应被跳过", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR({
        engine: "react",
        component: MinimalReactComponent,
        skipLayouts: true,
      });
      expect(result).toBeDefined();
      expect(result.html).toContain("ok");
    });

    it("Preact：带 layout 时应正确嵌套渲染", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const Layout = ({ children }: { children?: ComponentChildren }) =>
        createElement("div", { className: "layout" }, children);

      const result = await renderService.renderSSR({
        engine: "preact",
        component: MinimalPreactComponent,
        layouts: [{ component: Layout, props: {} }],
      });
      expect(result).toBeDefined();
      expect(result.html).toContain("ok");
      expect(result.html).toContain("layout");
    });

    it("React：带 layout 时应正确嵌套渲染", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const Layout = ({ children }: { children?: unknown }) =>
        createElementReact("div", { className: "layout" }, children);

      const result = await renderService.renderSSR({
        engine: "react",
        component: MinimalReactComponent,
        layouts: [{ component: Layout, props: {} }],
      });
      expect(result).toBeDefined();
      expect(result.html).toContain("ok");
      expect(result.html).toContain("layout");
    });

    it("Preact：loadContext 应传递给 load 方法", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR({
        engine: "preact",
        component: MinimalPreactComponent,
        loadContext: { url: "/test", params: { id: "123" } },
      });
      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
    });

    it("React：loadContext 应传递给 load 方法", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR({
        engine: "react",
        component: MinimalReactComponent,
        loadContext: { url: "/test", params: {} },
      });
      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
    });

    it("返回结果应包含 html 和 renderInfo", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR({
        engine: "preact",
        component: MinimalPreactComponent,
      });
      expect(result).toHaveProperty("html");
      expect(typeof result.html).toBe("string");
      expect(result.renderInfo).toBeDefined();
      expect(result.renderInfo?.engine).toBe("preact");
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

    it("Preact：调用后应返回 Promise<string[]>", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      // 使用有效输出目录（runtime-adapter 兼容 Bun），空字符串会导致 mkdir 报错
      const outputDir = join(cwd(), "tests", "data", "render-ssg-out");

      const result = renderService.renderSSG(
        {
          engine: "preact",
          routes: [],
          outputDir,
          loadRouteComponent: () => Promise.resolve(MinimalPreactComponent),
        } as Parameters<typeof renderService.renderSSG>[0],
      );
      expect(result).toBeInstanceOf(Promise);

      const resolved = await result;
      expect(Array.isArray(resolved)).toBe(true);
    });

    it("React：调用后应返回 Promise<string[]>", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const outputDir = join(cwd(), "tests", "data", "render-ssg-out");

      const result = renderService.renderSSG(
        {
          engine: "react",
          routes: [],
          outputDir,
          loadRouteComponent: () => Promise.resolve(MinimalReactComponent),
        } as Parameters<typeof renderService.renderSSG>[0],
      );
      expect(result).toBeInstanceOf(Promise);

      const resolved = await result;
      expect(Array.isArray(resolved)).toBe(true);
    });

    it("Preact：routes 非空时应正确调用 loadRouteComponent", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const outputDir = join(cwd(), "tests", "data", "render-ssg-out");
      const loadedRoutes: string[] = [];

      const result = await renderService.renderSSG(
        {
          engine: "preact",
          routes: ["/", "/about"],
          outputDir,
          loadRouteComponent: (route: string) => {
            loadedRoutes.push(route);
            return Promise.resolve(MinimalPreactComponent);
          },
        } as Parameters<typeof renderService.renderSSG>[0],
      );
      expect(Array.isArray(result)).toBe(true);
      expect(loadedRoutes).toContain("/");
      expect(loadedRoutes).toContain("/about");
    });

    it("React：routes 非空时应正确调用 loadRouteComponent", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const outputDir = join(cwd(), "tests", "data", "render-ssg-out");
      const loadedRoutes: string[] = [];

      const result = await renderService.renderSSG(
        {
          engine: "react",
          routes: ["/"],
          outputDir,
          loadRouteComponent: (route: string) => {
            loadedRoutes.push(route);
            return Promise.resolve(MinimalReactComponent);
          },
        } as Parameters<typeof renderService.renderSSG>[0],
      );
      expect(Array.isArray(result)).toBe(true);
      expect(loadedRoutes).toContain("/");
    });

    it("Preact：不传 engine 时应使用 config 默认值", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = { render: { engine: "preact" } };

      initializeRender(container, config);
      const renderService = getRender(container);

      const outputDir = join(cwd(), "tests", "data", "render-ssg-out");

      const result = await renderService.renderSSG(
        {
          engine: "preact",
          routes: [],
          outputDir,
          loadRouteComponent: () => Promise.resolve(MinimalPreactComponent),
        } as Parameters<typeof renderService.renderSSG>[0],
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it("React：不传 engine 时应使用 config 默认值", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = { render: { engine: "react" } };

      initializeRender(container, config);
      const renderService = getRender(container);

      const outputDir = join(cwd(), "tests", "data", "render-ssg-out");

      const result = await renderService.renderSSG(
        {
          engine: "react",
          routes: [],
          outputDir,
          loadRouteComponent: () => Promise.resolve(MinimalReactComponent),
        } as Parameters<typeof renderService.renderSSG>[0],
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it("loadRouteComponent 返回 null 时应抛出", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      const outputDir = join(cwd(), "tests", "data", "render-ssg-out");

      await assertRejects(
        async () =>
          renderService.renderSSG(
            {
              engine: "preact",
              routes: ["/"],
              outputDir,
              loadRouteComponent: () => Promise.resolve(null),
            } as Parameters<typeof renderService.renderSSG>[0],
          ),
      );
    });
  });

  describe("配置边界", () => {
    it("config 为空对象时应使用默认 engine (preact)", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeRender(container, config);
      const renderService = getRender(container);

      // 不传 engine，config 无 render，应默认 preact
      const result = await renderService.renderSSR(
        {
          component: MinimalPreactComponent,
        } as Parameters<typeof renderService.renderSSR>[0],
      );
      expect(result).toBeDefined();
      expect(result.html).toContain("ok");
    });

    it("config.render 为空对象时应使用默认 engine", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = { render: {} };

      initializeRender(container, config);
      const renderService = getRender(container);

      const result = await renderService.renderSSR(
        {
          component: MinimalPreactComponent,
        } as Parameters<typeof renderService.renderSSR>[0],
      );
      expect(result).toBeDefined();
      expect(result.html).toContain("ok");
    });

    it("同时配置 engine 和 mode 时应正常初始化", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        render: { engine: "react", mode: "ssr" },
      };

      initializeRender(container, config);
      const renderService = getRender(container);

      expect(typeof renderService.renderSSR).toBe("function");
      expect(typeof renderService.renderSSG).toBe("function");
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
