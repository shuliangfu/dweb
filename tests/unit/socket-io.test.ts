/**
 * Socket.IO 集成测试
 *
 * 测试 src/feature/socket-io.ts：
 * - initializeSocketIo 启用/未启用
 * - getSocketIoServer、getSocketIoPath
 * - createSocketIoMiddleware 返回函数
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import {
  createSocketIoMiddleware,
  getSocketIoPath,
  getSocketIoServer,
  initializeSocketIo,
} from "../../src/feature/socket-io.ts";
import { initializeLogger } from "../../src/utils/logger.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("Socket.IO 集成 (socket-io.ts)", () => {
  it("未配置 socket 时 initializeSocketIo 应返回 undefined", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {};
    initializeLogger(container, config);

    const path = initializeSocketIo(container, config);
    expect(path).toBeUndefined();
  });

  it("配置 socket.adapter 为 socketio 时应返回路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { adapter: "socketio", path: "/socket.io/" },
    };
    initializeLogger(container, config);

    const path = initializeSocketIo(container, config);
    expect(path).toBe("/socket.io/");
  });

  it("配置 socket.adapter 为 socket-io 别名时应返回路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { adapter: "socket-io", path: "/socket.io/" },
    };
    initializeLogger(container, config);

    const path = initializeSocketIo(container, config);
    expect(path).toBe("/socket.io/");
  });

  it("配置 socket.adapter 为 socket.io 别名时应返回路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { adapter: "socket.io", path: "/socket.io/" },
    };
    initializeLogger(container, config);

    const path = initializeSocketIo(container, config);
    expect(path).toBe("/socket.io/");
  });

  it("配置 socket.config 嵌套结构时应返回路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: {
        adapter: "socketio",
        config: {
          path: "/socket.io/",
          allowCORS: true,
          pingTimeout: 20000,
        },
      },
    };
    initializeLogger(container, config);

    const path = initializeSocketIo(container, config);
    expect(path).toBe("/socket.io/");
  });

  it("未写 socket.cors 时应注入 origin:'*'（开放且不反射）", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { adapter: "socketio" },
    };
    initializeLogger(container, config);
    initializeSocketIo(container, config);
    const io = getSocketIoServer(container);
    expect(io.options.cors?.origin).toBe("*");
  });

  it("应将 AppConfig.cors.origin 桥接到 Socket.IO", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      cors: { origin: ["https://app.example.com"], credentials: true },
      socket: { adapter: "socketio" },
    };
    initializeLogger(container, config);
    initializeSocketIo(container, config);
    const io = getSocketIoServer(container);
    expect(io.options.cors?.origin).toEqual(["https://app.example.com"]);
    expect(io.options.cors?.credentials).toBe(true);
  });

  it("socket.config.cors 应优先于 AppConfig.cors", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      cors: { origin: ["https://app.example.com"] },
      socket: {
        adapter: "socketio",
        config: {
          cors: { origin: ["https://socket.example.com"] },
        },
      },
    };
    initializeLogger(container, config);
    initializeSocketIo(container, config);
    const io = getSocketIoServer(container);
    expect(io.options.cors?.origin).toEqual(["https://socket.example.com"]);
  });

  it("getSocketIoPath 应返回已注册的路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { adapter: "socketio", path: "/custom/" },
    };
    initializeLogger(container, config);
    initializeSocketIo(container, config);

    const path = getSocketIoPath(container);
    expect(path).toBe("/custom/");
  });

  it("getSocketIoServer 应返回 Server 实例", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { adapter: "socketio" },
    };
    initializeLogger(container, config);
    initializeSocketIo(container, config);

    const io = getSocketIoServer(container);
    expect(io).toBeDefined();
    expect(typeof io.on).toBe("function");
  });

  it("createSocketIoMiddleware 应返回中间件函数", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { adapter: "socketio" },
    };
    initializeLogger(container, config);
    initializeSocketIo(container, config);

    const middleware = createSocketIoMiddleware(container);
    expect(typeof middleware).toBe("function");
  });

  it("传入 handlers 时 connection 应触发 onConnection 回调", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = { socket: { adapter: "socketio" } };
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

    initializeSocketIo(container, config, handlers);
    const io = getSocketIoServer(container);

    // 通过默认命名空间 listeners 数组触发（与 initializeSocketIo 注册方式一致）
    const defaultNs = io.of("/") as unknown as {
      listeners: ((s: unknown) => void)[];
    };
    const connListeners = defaultNs.listeners;
    expect(connListeners.length).toBeGreaterThan(0);

    const mockSocket = {
      id: "test-socket-id",
      nsp: "/",
      rooms: new Set<string>(),
      handshake: { url: "http://localhost/", headers: {}, query: {} },
      on: () => mockSocket,
      emit: () => true,
      join: () => {},
      leave: () => {},
      to: () => ({ emit: () => true }),
      broadcast: { emit: () => true },
      disconnect: () => mockSocket,
      connected: true,
    };

    for (const fn of connListeners) {
      fn(mockSocket);
    }

    expect(onConnectionCalled).toBe(true);
  });
});
