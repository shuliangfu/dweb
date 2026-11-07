/**
 * 可选 `@dreamer/upload@^2` 集成（加法；未配置 `AppConfig.upload` 时不加载）。
 *
 * 意图：提供本机磁盘分片上传的一等公民挂载，默认走 upload 2.0 安全默认
 * （`requireAuth: true` —— 未配 authenticate 则拒写）。
 * 不变量：不强制依赖；动态 import，未装包时给出明确错误。
 * 边界：云适配器（S3/OSS/COS）由调用方自建 storage 传入；本模块默认 local-cloud。
 * 为何不并进 app-http-middlewares：upload 是可选大面，避免冷启动拉整包。
 *
 * @module
 */

import type { Middleware } from "@dreamer/middleware";
import type { HttpContext } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig, UploadAppConfig } from "../types/app.ts";
import { getLogger } from "../utils/logger.ts";

/** 容器中上传 handler 的 key */
export const UPLOAD_HANDLER_KEY = "uploadHandler";

/**
 * 若配置了 `upload`，动态加载 `@dreamer/upload` 并注册路径前缀中间件。
 *
 * @returns 挂载的 basePath；未启用返回 undefined
 */
export async function registerUploadIntegration(
  server: {
    use: (
      middleware: Middleware<HttpContext>,
      condition?: string | Middleware<HttpContext>,
      name?: string,
    ) => void;
  },
  container: ServiceContainer,
  config: AppConfig,
): Promise<string | undefined> {
  const uploadCfg = config.upload;
  // boolean|object：false／undefined／null 都不挂载（先判假避免 `=== false` 与 true|object 无交集）
  if (uploadCfg == null || uploadCfg === false) return undefined;

  const opts: UploadAppConfig = uploadCfg === true ? {} : uploadCfg;
  const basePath = (opts.basePath ?? "/ui-view-upload").replace(/\/$/, "") ||
    "/ui-view-upload";

  type UploadHandler = {
    handle: (
      request: Request,
      basePath?: string,
    ) => Promise<Response | null> | Response | null;
  };
  type CreateLocal = (c: {
    baseDir: string;
    publicFileBasePath?: string;
  }) => unknown;
  type CreateHandler = (c: {
    storage: unknown;
    requireAuth?: boolean;
    authenticate?: UploadAppConfig["authenticate"];
    authorizeUpload?: UploadAppConfig["authorizeUpload"];
    maxFileSize?: number;
    maxPartSize?: number;
    allowedMimeTypes?: string[];
    pathPrefix?: string;
    onEvent?: UploadAppConfig["onEvent"];
    verifyContentAfterComplete?: boolean;
    sessionTtlMs?: number;
    virusScan?: UploadAppConfig["virusScan"];
  }) => UploadHandler;

  let createLocalCloudStorageAdapter: CreateLocal;
  let createMultipartUploadHandler: CreateHandler;

  try {
    const adapters = await import("@dreamer/upload/adapters");
    const serverMod = await import("@dreamer/upload/server");
    // 经 unknown 再收窄：避免 MultipartUploadHandlerConfig 与本地松散类型直接强转报错
    createLocalCloudStorageAdapter = adapters
      .createLocalCloudStorageAdapter as unknown as CreateLocal;
    createMultipartUploadHandler = serverMod
      .createMultipartUploadHandler as unknown as CreateHandler;
  } catch (err) {
    const msg =
      "@dreamer/upload is required for AppConfig.upload. Add jsr:@dreamer/upload@^2 (and /adapters,/server subpaths).";
    getLogger(container).error(msg, err);
    throw new Error(msg, { cause: err });
  }

  const storage = opts.storage ??
    createLocalCloudStorageAdapter({
      baseDir: opts.localDir ?? "./uploads",
      publicFileBasePath: opts.publicFileBasePath ?? `${basePath}/file`,
    });

  /**
   * requireAuth 默认 true（upload 2.0 BREAKING）。
   * 本地演示可 `requireAuth: false`；生产请接 authenticate。
   */
  const handler = createMultipartUploadHandler({
    storage,
    requireAuth: opts.requireAuth ?? true,
    authenticate: opts.authenticate,
    authorizeUpload: opts.authorizeUpload,
    maxFileSize: opts.maxFileSize,
    maxPartSize: opts.maxPartSize,
    allowedMimeTypes: opts.allowedMimeTypes,
    pathPrefix: opts.pathPrefix,
    onEvent: opts.onEvent,
    verifyContentAfterComplete: opts.verifyContentAfterComplete,
    sessionTtlMs: opts.sessionTtlMs,
    virusScan: opts.virusScan,
  });

  container.registerSingleton(UPLOAD_HANDLER_KEY, () => handler);

  const mw: Middleware<HttpContext> = async (ctx, next) => {
    if (!ctx.path.startsWith(basePath)) {
      await next();
      return;
    }
    const result = await handler.handle(ctx.request, basePath);
    if (result) {
      ctx.response = result;
      return;
    }
    await next();
  };

  server.use(mw, basePath, "upload");
  if (container.has("logger")) {
    getLogger(container).debug(`upload mounted at ${basePath}`);
  }
  return basePath;
}
