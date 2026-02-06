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

  it("配置 socket.type 为 socketio 时应返回路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { type: "socketio", path: "/socket.io/" },
    };
    initializeLogger(container, config);

    const path = initializeSocketIo(container, config);
    expect(path).toBe("/socket.io/");
  });

  it("getSocketIoPath 应返回已注册的路径", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { type: "socketio", path: "/custom/" },
    };
    initializeLogger(container, config);
    initializeSocketIo(container, config);

    const path = getSocketIoPath(container);
    expect(path).toBe("/custom/");
  });

  it("getSocketIoServer 应返回 Server 实例", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      socket: { type: "socketio" },
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
      socket: { type: "socketio" },
    };
    initializeLogger(container, config);
    initializeSocketIo(container, config);

    const middleware = createSocketIoMiddleware(container);
    expect(typeof middleware).toBe("function");
  });
});
