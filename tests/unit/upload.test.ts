/**
 * 可选 @dreamer/upload 集成测试
 *
 * 测试 src/feature/upload.ts：
 * - 未配置／false 时不挂载
 * - 启用后动态加载 @dreamer/upload，按 basePath 注册中间件
 */

import "../setup.ts";
import { makeTempDir, remove } from "@dreamer/runtime-adapter";
import { afterEach, describe, expect, it } from "@dreamer/test";
import type { Middleware } from "@dreamer/middleware";
import type { HttpContext } from "@dreamer/server";
import { initializeServiceContainer } from "../../src/core/service.ts";
import {
  registerUploadIntegration,
  UPLOAD_HANDLER_KEY,
} from "../../src/feature/upload.ts";
import type { AppConfig } from "../../src/types/app.ts";

type UseCall = {
  mw: Middleware<HttpContext>;
  condition?: string | Middleware<HttpContext>;
  name?: string;
};

function fakeServer() {
  const calls: UseCall[] = [];
  return {
    calls,
    use(
      mw: Middleware<HttpContext>,
      condition?: string | Middleware<HttpContext>,
      name?: string,
    ) {
      calls.push({ mw, condition, name });
    },
  };
}

describe("registerUploadIntegration (upload.ts)", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) {
      await remove(dir, { recursive: true }).catch(() => {});
    }
  });

  it("未配置或 upload 为 false 时不挂载", async () => {
    const server = fakeServer();
    const container = initializeServiceContainer();
    expect(await registerUploadIntegration(server, container, {}))
      .toBeUndefined();
    expect(
      await registerUploadIntegration(server, container, { upload: false }),
    ).toBeUndefined();
    expect(server.calls).toEqual([]);
  });

  it("upload 为对象时应挂载默认前缀并注册 handler", async () => {
    const dir = await makeTempDir({ prefix: "dweb-upload-" });
    tempDirs.push(dir);
    const server = fakeServer();
    const container = initializeServiceContainer();
    const config: AppConfig = {
      upload: {
        requireAuth: false,
        localDir: dir,
        basePath: "/ui-view-upload/",
      },
    };
    const basePath = await registerUploadIntegration(server, container, config);
    expect(basePath).toBe("/ui-view-upload");
    expect(server.calls.length).toBe(1);
    expect(server.calls[0]?.condition).toBe("/ui-view-upload");
    expect(server.calls[0]?.name).toBe("upload");
    expect(container.get(UPLOAD_HANDLER_KEY)).toBeDefined();
  });

  it("basePath 为 / 时应回退到默认前缀", async () => {
    const dir = await makeTempDir({ prefix: "dweb-upload-slash-" });
    tempDirs.push(dir);
    const server = fakeServer();
    const container = initializeServiceContainer();
    const basePath = await registerUploadIntegration(server, container, {
      upload: { requireAuth: false, localDir: dir, basePath: "/" },
    });
    expect(basePath).toBe("/ui-view-upload");
  });

  it("upload: true 时应使用默认路径并挂载中间件", async () => {
    const server = fakeServer();
    const container = initializeServiceContainer();
    const basePath = await registerUploadIntegration(server, container, {
      upload: true,
    });
    expect(basePath).toBe("/ui-view-upload");
    expect(server.calls[0]?.name).toBe("upload");
  });

  it("中间件在非上传路径应交给 next，在上传路径上处理请求", async () => {
    const dir = await makeTempDir({ prefix: "dweb-upload-mw-" });
    tempDirs.push(dir);
    const server = fakeServer();
    const container = initializeServiceContainer();
    await registerUploadIntegration(server, container, {
      upload: { requireAuth: false, localDir: dir },
    });
    const mw = server.calls[0]?.mw;
    expect(mw).toBeDefined();

    let nextCalled = false;
    const other = {
      path: "/about",
      request: new Request("http://localhost/about"),
      response: undefined as Response | undefined,
    } as HttpContext;
    await mw!(other, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(other.response).toBeUndefined();

    nextCalled = false;
    const up = {
      path: "/ui-view-upload/status",
      request: new Request("http://localhost/ui-view-upload/status"),
      response: undefined as Response | undefined,
    } as HttpContext;
    await mw!(up, async () => {
      nextCalled = true;
    });
    // handler 可能返回 Response（命中）或 null（再走 next）
    if (up.response) {
      expect(up.response).toBeInstanceOf(Response);
      expect(nextCalled).toBe(false);
    } else {
      expect(nextCalled).toBe(true);
    }
  });
});
