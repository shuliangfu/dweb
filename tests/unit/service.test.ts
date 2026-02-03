/**
 * 服务容器集成测试
 *
 * 测试 src/core/service.ts 的功能：
 * - initializeServiceContainer 初始化服务容器
 * - getServiceContainer 获取服务容器
 */

import { describe, expect, it } from "@dreamer/test";
import {
  getServiceContainer,
  initializeServiceContainer,
} from "../../src/core/service.ts";

describe("服务容器集成 (service.ts)", () => {
  describe("initializeServiceContainer()", () => {
    it("应该创建一个服务容器实例", () => {
      const container = initializeServiceContainer();

      expect(container).toBeDefined();
      expect(typeof container.get).toBe("function");
      expect(typeof container.registerSingleton).toBe("function");
    });

    it("应该将容器自身注册为单例服务", () => {
      const container = initializeServiceContainer();
      const registeredContainer = container.get("serviceContainer");

      expect(registeredContainer).toBe(container);
    });

    it("每次调用应该创建新的容器实例", () => {
      const container1 = initializeServiceContainer();
      const container2 = initializeServiceContainer();

      expect(container1).not.toBe(container2);
    });

    it("应该支持注册和获取服务", () => {
      const container = initializeServiceContainer();

      // 注册一个测试服务
      container.registerSingleton("testService", () => ({ value: 42 }));

      // 获取服务
      const service = container.get<{ value: number }>("testService");

      expect(service.value).toBe(42);
    });

    it("单例服务每次获取应该返回相同实例", () => {
      const container = initializeServiceContainer();

      container.registerSingleton("singletonService", () => ({
        id: Math.random(),
      }));

      const instance1 = container.get<{ id: number }>("singletonService");
      const instance2 = container.get<{ id: number }>("singletonService");

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });
  });

  describe("getServiceContainer()", () => {
    it("应该从容器中获取已注册的服务容器", () => {
      const container = initializeServiceContainer();
      const retrievedContainer = getServiceContainer(container);

      expect(retrievedContainer).toBe(container);
    });

    it("应该与 initializeServiceContainer 注册的容器一致", () => {
      const container = initializeServiceContainer();

      // 通过两种方式获取容器
      const directAccess = container.get("serviceContainer");
      const helperAccess = getServiceContainer(container);

      expect(directAccess).toBe(helperAccess);
      expect(directAccess).toBe(container);
    });
  });

  describe("服务容器功能", () => {
    it("应该支持多个服务的注册和获取", () => {
      const container = initializeServiceContainer();

      container.registerSingleton("serviceA", () => ({ name: "A" }));
      container.registerSingleton("serviceB", () => ({ name: "B" }));
      container.registerSingleton("serviceC", () => ({ name: "C" }));

      expect(container.get<{ name: string }>("serviceA").name).toBe("A");
      expect(container.get<{ name: string }>("serviceB").name).toBe("B");
      expect(container.get<{ name: string }>("serviceC").name).toBe("C");
    });

    it("应该支持服务之间的依赖注入", () => {
      const container = initializeServiceContainer();

      // 注册基础服务
      container.registerSingleton("config", () => ({ port: 3000 }));

      // 注册依赖基础服务的服务
      container.registerSingleton("server", () => {
        const config = container.get<{ port: number }>("config");
        return { url: `http://localhost:${config.port}` };
      });

      const server = container.get<{ url: string }>("server");

      expect(server.url).toBe("http://localhost:3000");
    });
  });
});
