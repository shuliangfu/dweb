/**
 * WebSocket 集成测试
 *
 * 测试 src/feature/websocket.ts：
 * - initializeWebSocket 启用/未启用
 * - getWebSocketServer、getWebSocketPath
 * - createWebSocketMiddleware 返回函数
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import {
  createWebSocketMiddleware,
  getWebSocketPath,
  getWebSocketServer,
  initializeWebSocket,
} from "../../src/feature/websocket.ts";
import { initializeLogger } from "../../src/utils/logger.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("WebSocket 集成 (websocket.ts)", () => {
  it("未配置 socket 时 initializeWebSocket 应返回 undefined", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {};
    initializeLogger(container, config);

    const path = initializeWebSocket(container, config);
    expect(path).toBeUndefined();
  });

  it("配置 socket.type 为 websocket 时应返回路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { type: "websocket", path: "/ws" },
    };
    initializeLogger(container, config);

    const path = initializeWebSocket(container, config);
    expect(path).toBe("/ws");
  });

  it("getWebSocketPath 应返回已注册的路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { type: "websocket", path: "/custom-ws" },
    };
    initializeLogger(container, config);
    initializeWebSocket(container, config);

    const path = getWebSocketPath(container);
    expect(path).toBe("/custom-ws");
  });

  it("getWebSocketServer 应返回 Server 实例", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { type: "websocket" },
    };
    initializeLogger(container, config);
    initializeWebSocket(container, config);

    const ws = getWebSocketServer(container);
    expect(ws).toBeDefined();
    expect(typeof ws.on).toBe("function");
  });

  it("createWebSocketMiddleware 应返回中间件函数", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { type: "websocket" },
    };
    initializeLogger(container, config);
    initializeWebSocket(container, config);

    const middleware = createWebSocketMiddleware(container);
    expect(typeof middleware).toBe("function");
  });
});
