/**
 * Web 应用四模式渲染装配（从 app.ts 拆出，行为不变）
 *
 * csr / hybrid：HTML 渲染器 + /__data + /_client.js + 按需客户端构建
 * ssg：预渲染 HTML + /_client.js（无 load-data / 无 init 期 ensure build）
 * ssr（默认）：HTML 渲染器 + /_client.js + 按需客户端构建
 *
 * @module
 */

import type { HttpContext } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import { cwd, exists, getEnv, join } from "./runtime-adapter.ts";
import {
  buildClientScript,
  createClientScriptMiddleware,
  ensureClientEntryFile,
} from "../feature/csr-client-builder.ts";
import { createLoadDataMiddleware } from "../feature/load-data-middleware.ts";
import { createRendererCSR } from "../feature/render-csr.ts";
import { createRendererHybrid } from "../feature/render-hybrid.ts";
import { createRendererSSG } from "../feature/render-ssg.ts";
import { createRendererSSR } from "../feature/render-ssr.ts";
import type { AppConfig } from "../types/app.ts";
import { getClientOutputDir } from "../utils/build-dirs.ts";
import {
  CLIENT_OUTPUT_MAIN_FILENAME,
  DWEB_DATA_PATH,
} from "../utils/constants.ts";
import { $tr } from "../utils/i18n.ts";
import { getLogger } from "../utils/logger.ts";

/** 最小 server 面：setSSRRender + use（渲染器签名与 @dreamer/server 对齐，含 match 形参） */
export interface RenderPipelineServer {
  // deno-lint-ignore no-explicit-any
  setSSRRender: (render: (...args: any[]) => any) => void;
  use: (
    middleware: (
      ctx: HttpContext,
      next: () => Promise<void>,
    ) => Promise<void>,
    // 与 @dreamer/server Server.use 对齐（勿用 unknown，否则 Server 赋值会因参数逆变失败）
    condition?: string | ((
      ctx: HttpContext,
      next: () => Promise<void>,
    ) => Promise<void>),
    name?: string,
  ) => void;
}

export interface RegisterAppRenderPipelineDeps {
  container: ServiceContainer;
  /** 已 initializeRouter 后的 router（与 createRenderer* 入参一致） */
  // deno-lint-ignore no-explicit-any
  router: any;
  config: AppConfig;
  isBuildMode: () => boolean;
}

/**
 * 在需要客户端脚本的渲染模式下，按需生成 _client.tsx 并执行客户端构建。
 *
 * - RUNTIME_ENV=dev：始终保证入口并按需客户端构建（非 `--build` 进程内构建）
 * - RUNTIME_ENV=build | start：无预构建产物且当前不是「仅 CLI build」时再构建客户端
 */
export async function ensureClientBuildForRender(
  container: ServiceContainer,
  config: AppConfig,
  hasPrebuiltClient: boolean,
  isBuildMode: () => boolean,
): Promise<void> {
  const rt = getEnv("RUNTIME_ENV");

  if (rt === "dev") {
    await ensureClientEntryFile(container, config);
    if (!isBuildMode()) {
      await buildClientScript(container, config);
    }
  } else if (rt === "build" || rt === "start") {
    if (!hasPrebuiltClient && !isBuildMode()) {
      await buildClientScript(container, config);
    }
  } else {
    if (!hasPrebuiltClient && !isBuildMode()) {
      await buildClientScript(container, config);
    }
  }
}

async function registerClientScriptAndMaybeBuild(
  server: RenderPipelineServer,
  deps: RegisterAppRenderPipelineDeps,
): Promise<void> {
  const { container, config, isBuildMode } = deps;
  server.use(createClientScriptMiddleware(container, config));

  const clientOutputDir = getClientOutputDir(config);
  const prebuiltClientPath = join(
    cwd(),
    clientOutputDir,
    CLIENT_OUTPUT_MAIN_FILENAME,
  );
  const hasPrebuiltClient = await exists(prebuiltClientPath);
  await ensureClientBuildForRender(
    container,
    config,
    hasPrebuiltClient,
    isBuildMode,
  );
}

/** 四模式装配计划（便于单测，不碰 App/render 服务） */
export interface RenderPipelinePlan {
  mode: "csr" | "hybrid" | "ssg" | "ssr";
  loadData: boolean;
  clientScript: boolean;
  ensureClientBuild: boolean;
}

export function planRenderPipeline(
  mode: string | undefined,
): RenderPipelinePlan {
  const m = mode === "csr" || mode === "hybrid" || mode === "ssg" || mode === "ssr"
    ? mode
    : "ssr";
  if (m === "csr" || m === "hybrid") {
    return {
      mode: m,
      loadData: true,
      clientScript: true,
      ensureClientBuild: true,
    };
  }
  if (m === "ssg") {
    return {
      mode: "ssg",
      loadData: false,
      clientScript: true,
      ensureClientBuild: false,
    };
  }
  return {
    mode: "ssr",
    loadData: false,
    clientScript: true,
    ensureClientBuild: true,
  };
}

/**
 * 注册 Web 应用渲染管线（非 api / console HTTP 路径）。
 */
export async function registerAppRenderPipeline(
  server: RenderPipelineServer,
  deps: RegisterAppRenderPipelineDeps,
): Promise<void> {
  const { container, router, config, isBuildMode } = deps;
  const plan = planRenderPipeline(
    (config.render as { mode?: string } | undefined)?.mode,
  );
  const renderLogger = getLogger(container);

  if (plan.mode === "csr") {
    server.setSSRRender(createRendererCSR(container, router, config));
  } else if (plan.mode === "hybrid") {
    server.setSSRRender(createRendererHybrid(container, router, config));
  } else if (plan.mode === "ssg") {
    server.setSSRRender(createRendererSSG(container, router, config));
  } else {
    server.setSSRRender(createRendererSSR(container, router, config));
  }

  if (plan.loadData) {
    server.use(
      createLoadDataMiddleware(container, router, config),
      DWEB_DATA_PATH,
      "load-data",
    );
  }

  if (plan.ensureClientBuild) {
    await registerClientScriptAndMaybeBuild(server, deps);
  } else if (plan.clientScript) {
    server.use(createClientScriptMiddleware(container, config));
  }

  if (!isBuildMode()) {
    const msg = plan.mode === "csr"
      ? $tr("log.renderModeCsr")
      : plan.mode === "hybrid"
      ? $tr("log.renderModeHybrid")
      : plan.mode === "ssg"
      ? $tr("log.renderModeSsg")
      : $tr("log.renderModeSsr");
    renderLogger.debug(msg);
  }
}
