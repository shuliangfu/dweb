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

  it("配置 socket.config 嵌套结构时应返回路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: {
        adapter: "websocket",
        config: { path: "/ws", pingTimeout: 60000 },
      },
    };
    initializeLogger(container, config);

    const path = initializeWebSocket(container, config);
    expect(path).toBe("/ws");
  });

  it("配置 socket.adapter 为 websocket 时应返回路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { adapter: "websocket", path: "/ws" },
    };
    initializeLogger(container, config);

    const path = initializeWebSocket(container, config);
    expect(path).toBe("/ws");
  });

  it("getWebSocketPath 应返回已注册的路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { adapter: "websocket", path: "/custom-ws" },
    };
    initializeLogger(container, config);
    initializeWebSocket(container, config);

    const path = getWebSocketPath(container);
    expect(path).toBe("/custom-ws");
  });

  it("getWebSocketServer 应返回 Server 实例", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { adapter: "websocket" },
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
      socket: { adapter: "websocket" },
    };
    initializeLogger(container, config);
    initializeWebSocket(container, config);

    const middleware = createWebSocketMiddleware(container);
    expect(typeof middleware).toBe("function");
  });

  it("传入 handlers 时 connection 应触发 onConnection 回调", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = { socket: { adapter: "websocket" } };
    initializeLogger(container, config);

    let onConnectionCalled = false;
    const handlers = {
      onConnection() {
        onConnectionCalled = true;
      },
      onDisconnect() {
        // 由 socket.on("disconnect") 触发
      },
    };

    initializeWebSocket(container, config, handlers);
    const ws = getWebSocketServer(container);

    // 通过 Server 内部 listeners 触发（与 initializeWebSocket 注册方式一致）
    const listeners =
      (ws as unknown as { listeners: Map<string, ((s: unknown) => void)[]> })
        .listeners?.get("connection");
    expect(listeners?.length).toBeGreaterThan(0);

    const mockSocket = {
      id: "test-ws-id",
      handshake: { url: "http://localhost/ws", headers: new Headers() },
      getRawSocket: () => ({} as WebSocket),
      on: () => mockSocket,
    };

    for (const fn of listeners ?? []) {
      fn(mockSocket);
    }

    expect(onConnectionCalled).toBe(true);
  });
});
